// Jovin Ang Yusheng, A0273460H
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  cleanupLoadData,
  disconnectLoadDatabase,
  getProjectRoot,
  prepareLoadData,
} from "./loadDataManager.js";

const flow = process.argv[2];
const supportedFlows = new Set(["browsing", "auth.login", "auth.register", "admin-product", "payment", "orders"]);
const flowsWithDatabaseFixtures = new Set(["auth.login", "auth.register", "admin-product", "orders", "payment"]);
const flowThresholds = {
  "browsing": { P90: 100, P95: 150 },
  "auth.register": { P90: 700, P95: 900 },
  "auth.login": { P90: 100, P95: 150 },
  "admin-product": { P90: 1200, P95: 1600 },
  "orders": { P90: 900, P95: 1100 },
  "payment": { P90: 800, P95: 1000 },
};

if (!supportedFlows.has(flow)) {
  console.error(`Unsupported load-test flow "${flow}".`);
  console.error(`Supported flows: ${[...supportedFlows].join(", ")}`);
  process.exit(1);
}

const runId = `${flow}-${Date.now()}`;
const projectRoot = getProjectRoot();
const scriptPath = path.join("__tests__", "performance", "load", `${flow}.load.js`);
const reportsDir = path.join(
  projectRoot,
  "__tests__",
  "performance",
  "load",
  "reports"
);

let exitCode = 1;

try {
  const seedResult = await prepareLoadData(flow, runId);
  if (seedResult.seededUserCount > 0) {
    console.log(`[load:${flow}] Seeded ${seedResult.seededUserCount} load users for run ${runId}.`);
  }
  fs.mkdirSync(reportsDir, { recursive: true });

  const childEnv = {
    ...process.env,
    NODE_ENV: "test",
    LOAD_TEST_RUN_ID: runId,
    FLOW_TYPE: flow,
    LOAD_P90_THRESHOLD_MS: flowThresholds[flow].P90,
    LOAD_P95_THRESHOLD_MS: flowThresholds[flow].P95,
    K6_WEB_DASHBOARD: process.env.K6_WEB_DASHBOARD || "true",
    K6_WEB_DASHBOARD_EXPORT:
      process.env.K6_WEB_DASHBOARD_EXPORT ||
      path.join(reportsDir, `${runId}.html`),
  };

  if (seedResult.userPool.length > 0) {
    childEnv.LOAD_USER_POOL = JSON.stringify(seedResult.userPool);
  }

  console.log(`[load:${flow}] Starting load test run ${runId}`);

  const result = spawnSync("k6", ["run", scriptPath], {
    cwd: projectRoot,
    stdio: "inherit",
    env: childEnv,
  });

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
      const cleanupResult = await cleanupLoadData(runId);
      const parts = [`${cleanupResult.deletedUsers} users`, `${cleanupResult.deletedOrders} orders`];
      if (cleanupResult.deletedProducts > 0) {
        parts.push(`${cleanupResult.deletedProducts} products`);
      }
      console.log(`[load:${flow}] Cleanup removed ${parts.join(", ")} for run ${runId}.`);
    }
  } finally {
    await disconnectLoadDatabase();
  }
}

process.exit(exitCode);
