import { spawnSync } from "child_process";
import path from "path";
import {
  cleanupStressData,
  disconnectStressDatabase,
  getProjectRoot,
  prepareStressData,
} from "./stressDataManager.js";

const flow = process.argv[2];
const supportedFlows = new Set(["browsing", "auth", "orders", "payment"]);
const flowsWithDatabaseFixtures = new Set(["auth", "orders", "payment"]);

if (!supportedFlows.has(flow)) {
  console.error(`Unsupported stress-test flow "${flow}".`);
  process.exit(1);
}

const runId = `${flow}-${Date.now()}`;
const projectRoot = getProjectRoot();
const scriptPath = path.join("__tests__", "performance", "stress", `${flow}.stress.js`);

let exitCode = 1;

try {
  const seedResult = await prepareStressData(flow, runId);
  const childEnv = {
    ...process.env,
    STRESS_TEST_RUN_ID: runId,
  };

  if (seedResult.userPool.length > 0) {
    childEnv.STRESS_USER_POOL = JSON.stringify(seedResult.userPool);
  }

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
      await cleanupStressData(runId);
    }
  } finally {
    await disconnectStressDatabase();
  }
}

process.exit(exitCode);
