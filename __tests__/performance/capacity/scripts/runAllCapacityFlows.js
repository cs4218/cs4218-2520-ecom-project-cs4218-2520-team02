import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { getProjectRoot } from "./capacityDataManager.js";

const flows = ["browsing", "auth.login", "auth.register", "orders", "payment"];
const projectRoot = getProjectRoot();
const runnerPath = path.join(
  "__tests__",
  "performance",
  "capacity",
  "scripts",
  "runCapacityFlow.js"
);
const reportsDir = path.join(
  projectRoot,
  "__tests__",
  "performance",
  "capacity",
  "reports"
);
const runId = `all-capacity-${Date.now()}`;

fs.mkdirSync(reportsDir, { recursive: true });

const results = [];

for (const flow of flows) {
  const reportPath = path.join(reportsDir, `${flow}-${runId}.html`);
  console.log(`\n=== Running ${flow} capacity test ===\n`);
  console.log(`[capacity:${flow}] HTML report export: ${reportPath}`);

  const result = spawnSync("node", [runnerPath, flow], {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      K6_WEB_DASHBOARD_EXPORT: reportPath,
    },
  });

  const exitCode =
    typeof result.status === "number" ? result.status : result.error ? 1 : 1;

  results.push({ flow, exitCode, reportPath });
}

console.log("\n=== Capacity Test Summary ===");
for (const { flow, exitCode, reportPath } of results) {
  const status = exitCode === 0 ? "PASS" : "FAIL";
  console.log(`${flow}: ${status} (${reportPath})`);
}

const hasFailures = results.some(({ exitCode }) => exitCode !== 0);
process.exit(hasFailures ? 1 : 0);
