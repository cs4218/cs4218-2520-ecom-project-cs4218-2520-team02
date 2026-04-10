// Censon Lee Lemuel John Alejo, A0273436B
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  cleanupStressData,
  disconnectStressDatabase,
  getProjectRoot,
  prepareStressData,
} from "./stressDataManager.js";
import { injectOverviewMetrics } from "../../common/node/reportUtils.js";

const flow = process.argv[2];
const supportedFlows = new Set(["browsing", "auth.login", "auth.register", "orders", "payment"]);
const flowsWithDatabaseFixtures = new Set(["auth.login", "auth.register", "orders", "payment"]);
const flowThresholds = {
  "browsing": { P90: 6000, P95: 8800 },
  "auth.register": { P90: 6000, P95: 8800 },
  "auth.login": { P90: 2800, P95: 4000 },
  "orders": { P90: 4800, P95: 6800 },
  "payment": { P90: 7200, P95: 10000 },
};

if (!supportedFlows.has(flow)) {
  console.error(`Unsupported stress-test flow "${flow}".`);
  process.exit(1);
}

const runId = `${flow}-${Date.now()}`;
const projectRoot = getProjectRoot();
const scriptPath = path.join("__tests__", "performance", "stress", `${flow}.stress.js`);
const reportsDir = path.join(
  projectRoot,
  "__tests__",
  "performance",
  "stress",
  "reports"
);

let exitCode = 1;

try {
  const seedResult = await prepareStressData(flow, runId);
  if (seedResult.seededUserCount > 0) {
    console.log(`[stress:${flow}] Seeded ${seedResult.seededUserCount} stress users for run ${runId}.`);
  }
  fs.mkdirSync(reportsDir, { recursive: true });

  const baseChildEnv = {
    ...process.env,
    NODE_ENV: "test",
    PERFORMANCE_TEST: "true",
    K6_WEB_DASHBOARD: process.env.K6_WEB_DASHBOARD || "true",
    FLOW_TYPE: flow,
    P90_THRESHOLD_MS: flowThresholds[flow].P90,
    P95_THRESHOLD_MS: flowThresholds[flow].P95,
    // Braintree sandbox test nonce — always succeeds in sandbox mode.
    // Override with e.g. "fake-processor-declined-visa-nonce" to test failure paths.
    PAYMENT_NONCE: process.env.PAYMENT_NONCE || "fake-valid-nonce",
  };

  if (seedResult.userPool.length > 0) {
    baseChildEnv.STRESS_USER_POOL = JSON.stringify(seedResult.userPool);
  }

  const reportFilePath =
    process.env.K6_WEB_DASHBOARD_EXPORT ||
    path.join(reportsDir, `${runId}.html`);

  const childEnv = {
    ...baseChildEnv,
    STRESS_TEST_RUN_ID: runId,
    K6_WEB_DASHBOARD_EXPORT: reportFilePath,
  };

  const result = spawnSync("k6", ["run", scriptPath], {
    cwd: projectRoot,
    stdio: "inherit",
    env: childEnv,
  });

  injectOverviewMetrics(reportFilePath, { suiteLabel: `stress:${flow}` });

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
      const cleanupResult = await cleanupStressData(runId);
      console.log(
        `[stress:${flow}] Cleanup removed ${cleanupResult.deletedUsers} users and ${cleanupResult.deletedOrders} orders for run ${runId}.`
      );
    }
  } finally {
    await disconnectStressDatabase();
  }
}

process.exit(exitCode);
