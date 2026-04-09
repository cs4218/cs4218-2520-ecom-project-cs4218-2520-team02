// Gavin Sin Fu Chen, A0273285X
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import {
  cleanupCapacityData,
  disconnectCapacityDatabase,
  getProjectRoot,
  prepareCapacityData,
} from "./capacityDataManager.js";

const projectRoot = getProjectRoot();
const supportedFlows = new Set(["browsing", "orders", "payment", "auth.login", "auth.register"]);
const flow = supportedFlows.has(process.argv[2]) ? process.argv[2] : "browsing";
const flowsWithDatabaseFixtures = new Set(["orders", "payment", "auth.login"]);
const runId = `${flow}-capacity-${Date.now()}`;
const scriptPath = path.join("__tests__", "performance", "capacity", `${flow}.capacity.js`);
const reportsDir = path.join(
  projectRoot,
  "__tests__",
  "performance",
  "capacity",
  "reports"
);
const reportPath =
  process.env.K6_WEB_DASHBOARD_EXPORT ||
  path.join(reportsDir, `${runId}.html`);
const injectOnlyArgIndex = process.argv.indexOf("--inject-report");
const injectOnlyReportPath =
  injectOnlyArgIndex >= 0 && process.argv[injectOnlyArgIndex + 1]
    ? path.resolve(projectRoot, process.argv[injectOnlyArgIndex + 1])
    : "";

fs.mkdirSync(reportsDir, { recursive: true });

if (!injectOnlyReportPath) {
  console.log(`[capacity:${flow}] HTML report export: ${reportPath}`);
}

function parseDurationToSeconds(value) {
  const text = String(value || "").trim();
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h)/g)];

  if (matches.length === 0) {
    return 0;
  }

  return matches.reduce((total, match) => {
    const amount = Number(match[1]);
    const unit = match[2];

    if (unit === "ms") {
      return total + amount / 1000;
    }

    if (unit === "s") {
      return total + amount;
    }

    if (unit === "m") {
      return total + amount * 60;
    }

    return total + amount * 3600;
  }, 0);
}

function getNumberEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function buildCapacityStages() {
  const defaultStageConfig = {
          startUsers: 50,
          stepUsers: 100,
          maxUsers: 450,
          rampDuration: "30s",
          holdDuration: "1m",
          cooldownDuration: "30s",
        };
  const startUsers = Math.max(1, getNumberEnv("CAPACITY_START_VUS", defaultStageConfig.startUsers));
  const stepUsers = Math.max(1, getNumberEnv("CAPACITY_STEP_VUS", defaultStageConfig.stepUsers));
  const maxUsers = Math.max(startUsers, getNumberEnv("CAPACITY_MAX_VUS", defaultStageConfig.maxUsers));
  const rampSeconds = parseDurationToSeconds(
    process.env.CAPACITY_RAMP_DURATION || defaultStageConfig.rampDuration
  );
  const holdSeconds = parseDurationToSeconds(
    process.env.CAPACITY_HOLD_DURATION || defaultStageConfig.holdDuration
  );
  const cooldownSeconds = parseDurationToSeconds(
    process.env.CAPACITY_COOLDOWN_DURATION || defaultStageConfig.cooldownDuration
  );
  const stages = [];
  let elapsed = 0;
  let previousTarget = 0;

  for (let target = startUsers; target <= maxUsers; target += stepUsers) {
    stages.push({
      name: `Ramp ${previousTarget}->${target} VUs`,
      start: elapsed,
      end: elapsed + rampSeconds,
    });
    elapsed += rampSeconds;
    stages.push({
      name: `Hold ${target} VUs`,
      start: elapsed,
      end: elapsed + holdSeconds,
    });
    elapsed += holdSeconds;
    previousTarget = target;
  }

  stages.push({
    name: `Cooldown ${previousTarget}->0 VUs`,
    start: elapsed,
    end: elapsed + cooldownSeconds,
  });

  return stages;
}

function getStageName(stages, elapsedSeconds) {
  const stage = stages.find(
    ({ start, end }) => elapsedSeconds >= start && elapsedSeconds < end
  );

  return stage?.name || "End/drain";
}

function getFinalMetricIndexes(events) {
  const metrics = {};
  for (const event of events) {
    if (event.event === "metric") {
      Object.assign(metrics, event.data);
    }
  }

  const names = Object.keys(metrics).sort();
  return {
    names,
    indexes: Object.fromEntries(names.map((name, index) => [name, index])),
  };
}

function getDashboardEvents(reportHtml) {
  const compressedEventData = [...reportHtml.matchAll(/[A-Za-z0-9+/]{100,}={0,2}/g)]
    .map((match) => match[0])
    .find((value) => value.startsWith("H4sI"));

  if (!compressedEventData) {
    return [];
  }

  return zlib
    .gunzipSync(Buffer.from(compressedEventData, "base64"))
    .toString("utf8")
    .trim()
    .split(/\n+/)
    .map((line) => JSON.parse(line));
}

function thresholdRows() {
  return [
    {
      metric: "http_req_duration",
      expression: `p(90)<${getNumberEnv("CAPACITY_HTTP_P90_THRESHOLD_MS", 1000)}`,
      counter: "capacity_http_req_duration_p90_breaches",
      label: "http_req_duration p90",
      slo: `< ${getNumberEnv("CAPACITY_HTTP_P90_THRESHOLD_MS", 1000)} ms`,
    },
    {
      metric: "http_req_duration",
      expression: `p(95)<${getNumberEnv("CAPACITY_HTTP_P95_THRESHOLD_MS", 1500)}`,
      counter: "capacity_http_req_duration_p95_breaches",
      label: "http_req_duration p95",
      slo: `< ${getNumberEnv("CAPACITY_HTTP_P95_THRESHOLD_MS", 1500)} ms`,
    },
    {
      metric: "http_req_duration",
      expression: `p(99)<${getNumberEnv("CAPACITY_HTTP_P99_THRESHOLD_MS", 2500)}`,
      counter: "capacity_http_req_duration_p99_breaches",
      label: "http_req_duration p99",
      slo: `< ${getNumberEnv("CAPACITY_HTTP_P99_THRESHOLD_MS", 2500)} ms`,
    },
    {
      metric: "http_req_failed",
      expression: `rate<${getNumberEnv("CAPACITY_HTTP_ERROR_RATE_THRESHOLD", 0.02)}`,
      counter: "capacity_http_req_failed_breaches",
      label: "http_req_failed",
      slo: `< ${getNumberEnv("CAPACITY_HTTP_ERROR_RATE_THRESHOLD", 0.02)}`,
    },
    {
      metric: "business_error_rate",
      expression: `rate<${getNumberEnv("CAPACITY_BUSINESS_ERROR_RATE_THRESHOLD", 0.02)}`,
      counter: "capacity_business_error_rate_breaches",
      label: "business_error_rate",
      slo: `< ${getNumberEnv("CAPACITY_BUSINESS_ERROR_RATE_THRESHOLD", 0.02)}`,
    },
    {
      metric: "transaction_success_rate",
      expression: `rate>${getNumberEnv("CAPACITY_TRANSACTION_SUCCESS_RATE_THRESHOLD", 0.98)}`,
      counter: "capacity_transaction_success_rate_breaches",
      label: "transaction_success_rate",
      slo: `> ${getNumberEnv("CAPACITY_TRANSACTION_SUCCESS_RATE_THRESHOLD", 0.98)}`,
    },
    {
      metric: "checks",
      expression: `rate>${getNumberEnv("CAPACITY_CHECK_SUCCESS_RATE_THRESHOLD", 0.98)}`,
      counter: "capacity_check_breaches",
      label: "checks",
      slo: `> ${getNumberEnv("CAPACITY_CHECK_SUCCESS_RATE_THRESHOLD", 0.98)}`,
    },
  ];
}

function analyzeCapacityThresholdBreaches(events) {
  const startTime = events.find((event) => event.event === "start")?.data?.[0]?.[0];
  const stopTime = events.find((event) => event.event === "stop")?.data?.[0]?.[0];
  const failedThresholds = events.find((event) => event.event === "threshold")?.data || {};
  const cumulative = events.find((event) => event.event === "cumulative")?.data || [];
  const { indexes: finalIndexes } = getFinalMetricIndexes(events);
  const stages = buildCapacityStages();
  const plannedDuration = stages.at(-1)?.end || 0;
  const runDuration =
    typeof startTime === "number" && typeof stopTime === "number"
      ? (stopTime - startTime) / 1000
      : plannedDuration;
  const timelineDuration = Math.max(plannedDuration, runDuration);
  const metricMap = {};
  const firstBreaches = {};

  if (typeof startTime !== "number") {
    return { stages, timelineDuration, failedThresholds, rows: [] };
  }

  for (const event of events) {
    if (event.event === "metric") {
      Object.assign(metricMap, event.data);
      continue;
    }

    if (event.event !== "snapshot") {
      continue;
    }

    const names = Object.keys(metricMap).sort();
    const indexes = Object.fromEntries(names.map((name, index) => [name, index]));
    const elapsedTime = event.data[indexes.time]?.[0];

    if (typeof elapsedTime !== "number") {
      continue;
    }

    const elapsedSeconds = (elapsedTime - startTime) / 1000;
    const activeVus = event.data[indexes.vus]?.[0];

    for (const row of thresholdRows()) {
      if (firstBreaches[row.counter]) {
        continue;
      }

      const count = event.data[indexes[row.counter]]?.[0];
      if (typeof count === "number" && count > 0) {
        firstBreaches[row.counter] = {
          elapsedSeconds,
          activeVus,
          stageName: getStageName(stages, elapsedSeconds),
        };
      }
    }
  }

  const rows = thresholdRows()
    .filter((row) => failedThresholds[row.metric]?.includes(row.expression))
    .map((row) => {
      const cumulativeValue = cumulative[finalIndexes[row.counter]]?.[0] || 0;
      return {
        ...row,
        breachCount: Math.round(cumulativeValue),
        firstBreach: firstBreaches[row.counter],
      };
    });

  return { stages, timelineDuration, failedThresholds, rows };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderCapacityStageBands(stages, timelineDuration) {
  return stages
    .map((stage) => {
      const left = (stage.start / timelineDuration) * 100;
      const width = ((stage.end - stage.start) / timelineDuration) * 100;
      return `<span class="capacity-stage" style="left:${left.toFixed(4)}%;width:${width.toFixed(4)}%;" title="${escapeHtml(stage.name)}">${escapeHtml(stage.name)}</span>`;
    })
    .join("");
}

function renderCapacityTimeline(analysis) {
  const rows = analysis.rows;
  const stageBands = renderCapacityStageBands(analysis.stages, analysis.timelineDuration);
  const hiddenMetrics = [
    "capacity_threshold_breaches",
    "capacity_business_error_rate_breaches",
    "capacity_check_breaches",
    "capacity_http_req_duration_p90_breaches",
    "capacity_http_req_duration_p95_breaches",
    "capacity_http_req_duration_p99_breaches",
    "capacity_http_req_failed_breaches",
    "capacity_transaction_success_rate_breaches",
    "completed_transactions",
    "failed_transactions",
  ];
  const rowHtml = rows
    .map((row) => {
      const markerLeft = row.firstBreach
        ? Math.min(100, (row.firstBreach.elapsedSeconds / analysis.timelineDuration) * 100)
        : 0;
      const marker = row.firstBreach
        ? `<span class="capacity-red-x" style="left:${markerLeft.toFixed(4)}%;" title="${escapeHtml(`${row.label} first crossed at ${row.firstBreach.elapsedSeconds.toFixed(1)}s, ${row.firstBreach.stageName}, ${Math.round(row.firstBreach.activeVus || 0)} active VUs`)}">&times;</span>`
        : `<span class="capacity-no-marker">No sample marker captured</span>`;

      return `
        <div class="capacity-row">
          <div class="capacity-row-label">
            <strong>${escapeHtml(row.label)}</strong>
            <span>${escapeHtml(row.slo)} | ${escapeHtml(row.breachCount)} marked sample breach(es)</span>
            <span>${row.firstBreach ? escapeHtml(`First marker: ${row.firstBreach.elapsedSeconds.toFixed(1)}s, ${row.firstBreach.stageName}, ${Math.round(row.firstBreach.activeVus || 0)} active VUs`) : "No first marker captured"}</span>
          </div>
          <div class="capacity-track">
            ${stageBands}
            ${marker}
          </div>
        </div>`;
    })
    .join("");

  return `
    <section id="capacity-threshold-breach-timeline" class="capacity-threshold-breach-timeline">
      <style>
        .capacity-threshold-breach-timeline {
          box-sizing: border-box;
          margin: 24px;
          padding: 20px;
          border: 1px solid #d8dee9;
          border-radius: 8px;
          background: #ffffff;
          color: #111827;
          font-family: Arial, sans-serif;
        }
        .capacity-threshold-breach-timeline * { box-sizing: border-box; }
        .capacity-threshold-breach-timeline h2 { margin: 0 0 8px; font-size: 22px; }
        .capacity-threshold-breach-timeline p { margin: 0 0 16px; color: #4b5563; }
        .capacity-row {
          display: grid;
          grid-template-columns: minmax(220px, 310px) 1fr;
          gap: 16px;
          align-items: center;
          margin: 14px 0;
        }
        .capacity-row-label strong { display: block; font-size: 14px; }
        .capacity-row-label span { display: block; margin-top: 4px; color: #4b5563; font-size: 12px; line-height: 1.35; }
        .capacity-track {
          position: relative;
          min-height: 52px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          overflow: hidden;
          background: #f8fafc;
        }
        .capacity-stage {
          position: absolute;
          top: 0;
          bottom: 0;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0 4px 5px;
          border-right: 1px solid #cbd5e1;
          color: #475569;
          font-size: 10px;
          text-align: center;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .capacity-stage:nth-child(odd) { background: rgba(226, 232, 240, 0.72); }
        .capacity-stage:nth-child(even) { background: rgba(241, 245, 249, 0.72); }
        .capacity-red-x {
          position: absolute;
          top: 7px;
          transform: translateX(-50%);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #dc2626;
          color: #ffffff;
          border: 2px solid #7f1d1d;
          font-size: 23px;
          line-height: 18px;
          font-weight: 700;
          text-align: center;
          z-index: 2;
          box-shadow: 0 2px 8px rgba(127, 29, 29, 0.35);
        }
        .capacity-no-marker {
          position: absolute;
          top: 16px;
          left: 12px;
          color: #64748b;
          font-size: 12px;
        }
        @media (max-width: 820px) {
          .capacity-row { grid-template-columns: 1fr; }
          .capacity-track { min-height: 68px; }
        }
      </style>
      <script>
        (() => {
          const hiddenMetrics = ${JSON.stringify(hiddenMetrics)};
          const hiddenMetricSet = new Set(hiddenMetrics);
          const containerSelectors = ["tr", "[role='row']", "li", "article", "section", "div"];

          function findContainer(node) {
            for (const selector of containerSelectors) {
              const container = node.closest(selector);
              if (container && !container.closest("#capacity-threshold-breach-timeline")) {
                return container;
              }
            }

            return null;
          }

          function hideCapacityMetricRows() {
            for (const node of document.querySelectorAll("body *")) {
              const text = node.textContent?.trim();
              if (!hiddenMetricSet.has(text)) {
                continue;
              }

              const container = findContainer(node);
              if (!container || container.dataset.capacityMetricHidden === "true") {
                continue;
              }

              container.dataset.capacityMetricHidden = "true";
              container.style.display = "none";
            }
          }

          const runHidePass = () => window.requestAnimationFrame(hideCapacityMetricRows);

          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", runHidePass, { once: true });
          } else {
            runHidePass();
          }

          const observer = new MutationObserver(runHidePass);
          observer.observe(document.body, { childList: true, subtree: true });
          window.setTimeout(() => observer.disconnect(), 15000);
        })();
      </script>
      <h2>Capacity Threshold Breach Timeline</h2>
      <p>Red X markers show the first recorded sample marker for each aggregate threshold that failed in this run. Hover a marker for exact time, stage, and active VUs.</p>
      ${rows.length > 0 ? rowHtml : "<p>No aggregate capacity thresholds failed in this run.</p>"}
    </section>`;
}

function injectCapacityTimeline(reportFilePath) {
  if (!fs.existsSync(reportFilePath)) {
    console.warn(`[capacity:${flow}] Report file not found, skipping timeline injection: ${reportFilePath}`);
    return;
  }

  const reportHtml = fs.readFileSync(reportFilePath, "utf8");
  const events = getDashboardEvents(reportHtml);
  if (events.length === 0) {
    console.warn(`[capacity:${flow}] Could not decode k6 dashboard data, skipping timeline injection.`);
    return;
  }

  const analysis = analyzeCapacityThresholdBreaches(events);
  const timelineHtml = renderCapacityTimeline(analysis);
  const withoutPreviousTimeline = reportHtml.replace(
    /\s*<section id="capacity-threshold-breach-timeline"[\s\S]*?<\/section>\s*/g,
    "\n"
  );

  fs.writeFileSync(
    reportFilePath,
    withoutPreviousTimeline.replace("</body>", `${timelineHtml}\n  </body>`)
  );
  console.log(`[capacity:${flow}] Injected threshold breach timeline into: ${reportFilePath}`);
}

if (injectOnlyReportPath) {
  injectCapacityTimeline(injectOnlyReportPath);
  process.exit(0);
}

let exitCode = 1;

try {
  const seedResult = flowsWithDatabaseFixtures.has(flow)
    ? await prepareCapacityData(flow, runId)
    : { userPool: [], seededUserCount: 0 };

  if (seedResult.seededUserCount > 0) {
    console.log(`[capacity:${flow}] Seeded ${seedResult.seededUserCount} capacity users for run ${runId}.`);
  }

  const childEnv = {
    ...process.env,
    CAPACITY_TEST_RUN_ID: runId,
    K6_WEB_DASHBOARD: process.env.K6_WEB_DASHBOARD || "true",
    K6_WEB_DASHBOARD_PERIOD: process.env.K6_WEB_DASHBOARD_PERIOD || "1s",
    K6_WEB_DASHBOARD_EXPORT: reportPath,
  };

  if (seedResult.userPool.length > 0) {
    childEnv.CAPACITY_USER_POOL = JSON.stringify(seedResult.userPool);
  }

  const result = spawnSync("k6", ["run", scriptPath], {
    cwd: projectRoot,
    stdio: "inherit",
    env: childEnv,
  });

  injectCapacityTimeline(reportPath);

  if (typeof result.status === "number") {
    exitCode = result.status;
  } else if (result.error) {
    throw result.error;
  } else {
    exitCode = 1;
  }
} finally {
  try {
    if (flowsWithDatabaseFixtures.has(flow)) {
      const cleanupResult = await cleanupCapacityData(runId);
      console.log(
        `[capacity:${flow}] Cleanup removed ${cleanupResult.deletedUsers} users and ${cleanupResult.deletedOrders} orders for run ${runId}.`
      );
    }
  } finally {
    await disconnectCapacityDatabase();
  }
}

process.exit(exitCode);
