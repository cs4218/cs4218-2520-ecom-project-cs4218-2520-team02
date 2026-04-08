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
const supportedFlows = new Set(["browsing", "auth", "payment", "orders"]);
const flowsWithDatabaseFixtures = new Set(["auth", "orders", "payment"]);

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
    LOAD_TEST_RUN_ID: runId,
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
      console.log(
        `[load:${flow}] Cleanup removed ${cleanupResult.deletedUsers} users and ${cleanupResult.deletedOrders} orders for run ${runId}.`
      );
    }
  } finally {
    await disconnectLoadDatabase();
  }
}

process.exit(exitCode);
