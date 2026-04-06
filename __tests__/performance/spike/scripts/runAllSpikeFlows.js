// Yap Zhao Yi, A0277540B
import { spawnSync } from "child_process";
import path from "path";
import { getProjectRoot } from "./spikeDataManager.js";

const flows = ["browsing", "auth", "orders", "payment"];
const projectRoot = getProjectRoot();
const runnerPath = path.join(
  "__tests__",
  "performance",
  "spike",
  "scripts",
  "runSpikeFlow.js"
);

const results = [];

for (const flow of flows) {
  console.log(`\n=== Running ${flow} spike test ===\n`);

  const result = spawnSync("node", [runnerPath, flow], {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
  });

  const exitCode =
    typeof result.status === "number" ? result.status : result.error ? 1 : 1;

  results.push({ flow, exitCode });
}

console.log("\n=== Spike Test Summary ===");
for (const { flow, exitCode } of results) {
  const status = exitCode === 0 ? "PASS" : "FAIL";
  console.log(`${flow}: ${status}`);
}

const hasFailures = results.some(({ exitCode }) => exitCode !== 0);
process.exit(hasFailures ? 1 : 0);
