import fs from "fs";
import zlib from "zlib";

export function getDashboardEvents(reportHtml) {
  const dataScriptStart = reportHtml.indexOf('<script id="data"');
  const startTagEnd = dataScriptStart >= 0 ? reportHtml.indexOf(">", dataScriptStart) : -1;
  const endTag = startTagEnd >= 0 ? reportHtml.indexOf("</script>", startTagEnd) : -1;
  const compressedEventData =
    startTagEnd >= 0 && endTag >= 0
      ? reportHtml.slice(startTagEnd + 1, endTag).trim()
      : "";

  if (!compressedEventData) {
    return { events: [], compressedEventData: "", startTagEnd: -1, endTag: -1 };
  }

  return {
    startTagEnd,
    endTag,
    compressedEventData,
    events: zlib
      .gunzipSync(Buffer.from(compressedEventData, "base64"))
      .toString("utf8")
      .trim()
      .split(/\n+/)
      .map((line) => JSON.parse(line)),
  };
}

export function clampRatePercentage(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  let normalized = Math.max(0, parsed);

  while (normalized > 1) {
    normalized /= 100;
  }

  return Math.min(normalized, 1);
}

export function repairLegacyNormalizedRateMetrics(events) {
  // k6 stores snapshot data in alphabetical order of metric names, and that order
  // shifts whenever a new metric event introduces additional metrics mid-run.
  // We must build the index incrementally (single pass, re-sorting on each new metric
  // event) so the index we use for each snapshot matches the layout k6 actually wrote.
  const sortedNames = [];
  const metricMeta = {};

  for (const event of events) {
    if (event.event === "metric") {
      let changed = false;
      for (const [name, meta] of Object.entries(event.data || {})) {
        if (!Object.prototype.hasOwnProperty.call(metricMeta, name)) {
          sortedNames.push(name);
          changed = true;
        }
        metricMeta[name] = meta;
      }
      if (changed) sortedNames.sort();
      continue;
    }

    if (event.event !== "snapshot" && event.event !== "cumulative") {
      continue;
    }

    if (!Array.isArray(event.data)) {
      continue;
    }

    for (const [name, meta] of Object.entries(metricMeta)) {
      if (meta?.type !== "rate") {
        continue;
      }

      const metricIndex = sortedNames.indexOf(name);
      if (metricIndex < 0) {
        continue;
      }

      const metricValue = event.data[metricIndex];

      if (!Array.isArray(metricValue)) {
        continue;
      }

      // Rate metrics have exactly 1 aggregate ("rate") so k6 stores them as a
      // single-element snapshot slot: [rate_fraction].  The dashboard reads data[0].
      //
      // 1-element [x]: normalise centesimal values (e.g. 99.07 → 0.9907) in place.
      // 2-element [a, b]: produced by a previous wrong run of this function that
      //   prepended a 0 (making [x] → [0, x]).  The real rate is in b; collapse
      //   back to the correct 1-element form so data[0] is readable again.
      if (metricValue.length === 1) {
        event.data[metricIndex] = [clampRatePercentage(metricValue[0])];
      } else if (metricValue.length === 2) {
        event.data[metricIndex] = [clampRatePercentage(metricValue[1])];
      }
    }
  }
}

/**
 * Post-processes a k6 HTML report to customise the HTTP Performance overview panel.
 *
 * @param {string} reportFilePath  - Absolute path to the HTML report file.
 * @param {object} options
 * @param {string}   options.suiteLabel    - Label used in console log/warn messages (e.g. "spike:browsing").
 * @param {string[]} [options.removePanelIds=[]] - IDs of extra panels to remove from the overview section.
 */
export function injectOverviewMetrics(reportFilePath, { suiteLabel, removePanelIds = [] } = {}) {
  if (!fs.existsSync(reportFilePath)) {
    console.warn(`[${suiteLabel}] Report file not found, skipping overview injection: ${reportFilePath}`);
    return;
  }

  const reportHtml = fs.readFileSync(reportFilePath, "utf8");
  const { events, compressedEventData, startTagEnd, endTag } = getDashboardEvents(reportHtml);

  if (events.length === 0 || !compressedEventData || startTagEnd < 0 || endTag < 0) {
    console.warn(`[${suiteLabel}] Could not decode k6 dashboard data, skipping overview injection.`);
    return;
  }

  repairLegacyNormalizedRateMetrics(events);

  const configEvent = events.find((event) => event.event === "config");
  const overviewTab = configEvent?.data?.tabs?.find((tab) => tab.title === "Overview");
  const overviewSection = overviewTab?.sections?.find((section) =>
    (section.panels || []).some((panel) => panel.title === "HTTP Performance overview")
  );
  const overviewPanels = overviewSection?.panels;
  const overviewPanel = overviewPanels?.find(
    (panel) => panel.title === "HTTP Performance overview"
  );

  if (!overviewPanels || !overviewPanel) {
    console.warn(`[${suiteLabel}] HTTP Performance overview panel not found, skipping injection.`);
    return;
  }

  if (removePanelIds.length > 0) {
    const removeSet = new Set(removePanelIds);
    for (let index = overviewPanels.length - 1; index >= 0; index -= 1) {
      if (removeSet.has(overviewPanels[index].id)) {
        overviewPanels.splice(index, 1);
      }
    }
  }

  // The k6 web dashboard assigns each series to a uPlot scale based on its unit
  // (e.g. "rps", "duration", "percent"). Series on different scales automatically
  // get separate y-axes, so mixing request rate (req/s), latency (ms), and error
  // rate (%) in one panel is safe — each line gets its own properly-scaled axis.
  overviewPanel.series = [
    { query: "http_reqs[?!tags && rate]", legend: "Request Rate (req/s)" },
    { query: "http_req_duration[?!tags && avg]", legend: "Duration avg (ms)" },
    { query: "http_req_duration[?!tags && p90]", legend: "Duration p(90) (ms)" },
    { query: "http_req_duration[?!tags && p95]", legend: "Duration p(95) (ms)" },
    { query: "http_req_failed[?!tags && rate]", legend: "HTTP Error Rate (%)" },
  ];
  overviewPanel.summary =
    "Request rate (req/s), latency percentiles (ms), and HTTP error rate (%) shown together. " +
    "Each metric type is plotted on its own y-axis so the scales do not interfere with each other.";
  overviewPanel.fullWidth = true;

  const serializedEvents = events.map((event) => JSON.stringify(event)).join("\n");
  const updatedCompressedData = zlib.gzipSync(serializedEvents).toString("base64");
  const rewrittenReportHtml =
    reportHtml.slice(0, startTagEnd + 1) +
    updatedCompressedData +
    reportHtml.slice(endTag);

  // uPlot's zero-data fallback sets max=100 when all values are 0, but the percent
  // formatter then multiplies by 100 again → 10000.0%. Patch it to 1 so the Y-axis
  // correctly caps at 100.0% for all-zero rate metric charts (e.g. 0% error rate).
  const patchedReportHtml = rewrittenReportHtml.replace(
    "H==J&&H==0&&(J=100)",
    "H==J&&H==0&&(J=1)"
  );

  fs.writeFileSync(reportFilePath, patchedReportHtml);
  console.log(`[${suiteLabel}] Updated overview panels and repaired legacy rate metrics when needed: ${reportFilePath}`);
}
