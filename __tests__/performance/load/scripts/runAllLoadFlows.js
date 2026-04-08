// Jovin Ang Yusheng, A0273460H
import { spawnSync } from "child_process";
import path from "path";
import { getProjectRoot } from "./loadDataManager.js";

const flows = ["browsing", "auth", "orders", "payment"];
const projectRoot = getProjectRoot();
const runnerPath = path.join(
  "__tests__",
  "performance",
  "load",
  "scripts",
  "runLoadFlow.js"
);

const results = [];

for (const flow of flows) {
  console.log(`\n=== Running ${flow} load test ===\n`);

  const result = spawnSync("node", [runnerPath, flow], {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
  });

  const exitCode =
    typeof result.status === "number" ? result.status : result.error ? 1 : 1;

  results.push({ flow, exitCode });
}

console.log("\n=== Load Test Summary ===");
for (const { flow, exitCode } of results) {
  const status = exitCode === 0 ? "PASS" : "FAIL";
  console.log(`${flow}: ${status}`);
}

const hasFailures = results.some(({ exitCode }) => exitCode !== 0);
process.exit(hasFailures ? 1 : 0);
