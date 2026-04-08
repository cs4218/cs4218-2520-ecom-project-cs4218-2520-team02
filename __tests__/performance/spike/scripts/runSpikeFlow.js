// Yap Zhao Yi, A0277540B
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
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

let exitCode = 1;

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
    console.log(`[spike:${flow}] Running spike with ${peak} VUs (run ID: ${runIdPeak})...`);

    const childEnvPeak = {
      ...baseChildEnv,
      SPIKE_TEST_RUN_ID: runIdPeak,
      SPIKE_PEAK_VUS: peak, // override peak VUs for this run
      K6_WEB_DASHBOARD_EXPORT: path.join(reportsDir, `${runIdPeak}.html`),
      K6_WEB_DASHBOARD_PERIOD: "1s",
    };

    const result = spawnSync("k6", ["run", scriptPath], {
      cwd: projectRoot,
      stdio: "inherit",
      env: childEnvPeak,
    });

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