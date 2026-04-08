// Censon Lee Lemuel John Alejo, A0273436B
import { spawnSync } from "child_process";
import path from "path";
import { getProjectRoot } from "./stressDataManager.js";

const flows = ["browsing", "auth.login", "auth.register", "orders", "payment"];
const projectRoot = getProjectRoot();
const runnerPath = path.join(
  "__tests__",
  "performance",
  "stress",
  "scripts",
  "runStressFlow.js"
);

const results = [];

for (const flow of flows) {
  console.log(`\n=== Running ${flow} stress test ===\n`);

  const result = spawnSync("node", [runnerPath, flow], {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
  });

  const exitCode =
    typeof result.status === "number" ? result.status : result.error ? 1 : 1;

  results.push({ flow, exitCode });
}

console.log("\n=== Stress Test Summary ===");
for (const { flow, exitCode } of results) {
  const status = exitCode === 0 ? "PASS" : "FAIL";
  console.log(`${flow}: ${status}`);
}

const hasFailures = results.some(({ exitCode }) => exitCode !== 0);
process.exit(hasFailures ? 1 : 0);
