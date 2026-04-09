// Yap Zhao Yi, A0277540B
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import {
  cleanupSpikeData,
  disconnectSpikeDatabase,
  getProjectRoot,
  prepareSpikeData,
} from "./spikeDataManager.js";

const flow = process.argv[2];
const supportedFlows = new Set(["browsing", "auth.login", "auth.register", "orders", "payment"]);
const flowsWithDatabaseFixtures = new Set(["auth.login", "auth.register", "orders", "payment"]);

if (!supportedFlows.has(flow)) {
  console.error(`Unsupported spike-test flow "${flow}".`);
  process.exit(1);
}

// Set default thresholds per flow
const flowThresholds = {
  "browsing": { P90: 1500, P95: 2200 },
  "auth.register": { P90: 1500, P95: 2200 },
  "auth.login": { P90: 700, P95: 1000 },
  "orders": { P90: 1200, P95: 1700 },
  "payment": { P90: 1800, P95: 2500 },
};

const spikePeaks = [150, 200, 250];

const runId = `${flow}-${Date.now()}`;
const projectRoot = getProjectRoot();
const scriptPath = path.join("__tests__", "performance", "spike", `${flow}.spike.js`);
const reportsDir = path.join(projectRoot, "__tests__", "performance", "spike", "reports");
const injectOnlyArgIndex = process.argv.indexOf("--inject-report");
const injectOnlyReportPath =
  injectOnlyArgIndex >= 0 && process.argv[injectOnlyArgIndex + 1]
    ? path.resolve(projectRoot, process.argv[injectOnlyArgIndex + 1])
    : "";

let exitCode = 1;

function getDashboardEvents(reportHtml) {
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

function clampRatePercentage(value) {
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

function repairLegacyNormalizedRateMetrics(events) {
  const metricMap = {};
  const metricIndexes = {};
  let nextIndex = 0;

  for (const event of events) {
    if (event.event === "metric") {
      for (const [name, meta] of Object.entries(event.data || {})) {
        if (!(name in metricIndexes)) {
          metricIndexes[name] = nextIndex++;
        }

        metricMap[name] = meta;
      }

      continue;
    }

    if (event.event !== "snapshot" && event.event !== "cumulative") {
      continue;
    }

    if (!Array.isArray(event.data)) {
      continue;
    }

    for (const [name, meta] of Object.entries(metricMap)) {
      if (meta?.type !== "rate") {
        continue;
      }

      const metricIndex = metricIndexes[name];
      const metricValue = event.data[metricIndex];

      if (!Array.isArray(metricValue) || metricValue.length !== 1) {
        continue;
      }

      event.data[metricIndex] = [0, clampRatePercentage(metricValue[0])];
    }
  }
}

function injectSpikeOverviewMetrics(reportFilePath) {
  if (!fs.existsSync(reportFilePath)) {
    console.warn(`[spike:${flow}] Report file not found, skipping overview injection: ${reportFilePath}`);
    return;
  }

  const reportHtml = fs.readFileSync(reportFilePath, "utf8");
  const { events, compressedEventData, startTagEnd, endTag } = getDashboardEvents(reportHtml);

  if (events.length === 0 || !compressedEventData || startTagEnd < 0 || endTag < 0) {
    console.warn(`[spike:${flow}] Could not decode k6 dashboard data, skipping overview injection.`);
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
    console.warn(`[spike:${flow}] HTTP Performance overview panel not found, skipping injection.`);
    return;
  }

  for (let index = overviewPanels.length - 1; index >= 0; index -= 1) {
    if (overviewPanels[index].id === "tab-0.section-1.panel-spike-failed-overview") {
      overviewPanels.splice(index, 1);
    }
  }

  overviewPanel.series = [
    { query: "http_reqs[?!tags && rate]", legend: "Request Rate" },
    { query: "http_req_duration[?!tags && avg]", legend: "Request Duration avg" },
    { query: "http_req_duration[?!tags && p90]", legend: "Request Duration p(90)" },
    { query: "http_req_duration[?!tags && p95]", legend: "Request Duration p(95)" },
    { query: "http_req_failed[?!tags && rate]", legend: "Request Failed" },
  ];
  overviewPanel.summary =
    "The HTTP request rate represents the number of requests over a period of time. " +
    "The HTTP request duration average, 90th percentile, and 95th percentile show how latency behaves throughout the run. " +
    "The HTTP request failed rate is included in the same overview for quick comparison with latency.";
  overviewPanel.fullWidth = true;

  const serializedEvents = events.map((event) => JSON.stringify(event)).join("\n");
  const updatedCompressedData = zlib.gzipSync(serializedEvents).toString("base64");
  const rewrittenReportHtml =
    reportHtml.slice(0, startTagEnd + 1) +
    updatedCompressedData +
    reportHtml.slice(endTag);

  fs.writeFileSync(reportFilePath, rewrittenReportHtml);
  console.log(`[spike:${flow}] Updated overview panels and repaired legacy rate metrics when needed: ${reportFilePath}`);
}

if (injectOnlyReportPath) {
  injectSpikeOverviewMetrics(injectOnlyReportPath);
  process.exit(0);
}

try {
  // Prepare seed data for spike test
  const seedResult = await prepareSpikeData(flow, runId);
  if (seedResult.seededUserCount > 0) {
    console.log(`[spike:${flow}] Seeded ${seedResult.seededUserCount} spike users for run ${runId}.`);
  }

  fs.mkdirSync(reportsDir, { recursive: true });

  // Base environment variables for k6
  const baseChildEnv = {
    ...process.env,
    NODE_ENV: "test",
    K6_WEB_DASHBOARD: process.env.K6_WEB_DASHBOARD || "true",
    FLOW_TYPE: flow,
    P90_THRESHOLD_MS: flowThresholds[flow].P90,
    P95_THRESHOLD_MS: flowThresholds[flow].P95,
  };

  if (seedResult.userPool.length > 0) {
    baseChildEnv.SPIKE_USER_POOL = JSON.stringify(seedResult.userPool);
  }

  for (const peak of spikePeaks) {
    const runIdPeak = `${runId}-${peak}`;
    const reportPath = path.join(reportsDir, `${runIdPeak}.html`);
    console.log(`[spike:${flow}] Running spike with ${peak} VUs (run ID: ${runIdPeak})...`);

    const childEnvPeak = {
      ...baseChildEnv,
      SPIKE_TEST_RUN_ID: runIdPeak,
      SPIKE_PEAK_VUS: peak, // override peak VUs for this run
      K6_WEB_DASHBOARD_EXPORT: reportPath,
      K6_WEB_DASHBOARD_PERIOD: "1s",
    };

    const result = spawnSync("k6", ["run", scriptPath], {
      cwd: projectRoot,
      stdio: "inherit",
      env: childEnvPeak,
    });

    injectSpikeOverviewMetrics(reportPath);

    if (typeof result.status === "number") {
      exitCode = result.status;
    } else if (result.error) {
      throw result.error;
    } else {
      exitCode = 1;
    }
  }
} finally {
  try {
    // Clean up database fixtures if required
    if (flowsWithDatabaseFixtures.has(flow)) {
      const cleanupResult = await cleanupSpikeData(runId);
      console.log(
        `[spike:${flow}] Cleanup removed ${cleanupResult.deletedUsers} users and ${cleanupResult.deletedOrders} orders for run ${runId}.`
      );
    }
  } finally {
    await disconnectSpikeDatabase();
  }
}

process.exit(exitCode);
