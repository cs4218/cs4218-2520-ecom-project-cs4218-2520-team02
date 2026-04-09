import { getNumberEnv, getOptionalEnv } from "../../common/k6/env.js";

export function createCapacityStages(defaults = {}) {
  const {
    startVUs = 50,
    stepVUs = 100,
    maxVUs = 450,
    rampDuration = "30s",
    holdDuration = "1m",
    cooldownDuration = "30s",
  } = defaults;

  const startUsers = Math.max(1, getNumberEnv("CAPACITY_START_VUS", startVUs));
  const stepUsers = Math.max(1, getNumberEnv("CAPACITY_STEP_VUS", stepVUs));
  const maxUsers = Math.max(startUsers, getNumberEnv("CAPACITY_MAX_VUS", maxVUs));
  const stages = [];

  for (let target = startUsers; target <= maxUsers; target += stepUsers) {
    stages.push({
      duration: getOptionalEnv("CAPACITY_RAMP_DURATION", rampDuration),
      target,
    });
    stages.push({
      duration: getOptionalEnv("CAPACITY_HOLD_DURATION", holdDuration),
      target,
    });
  }

  stages.push({
    duration: getOptionalEnv("CAPACITY_COOLDOWN_DURATION", cooldownDuration),
    target: 0,
  });

  return stages;
}
