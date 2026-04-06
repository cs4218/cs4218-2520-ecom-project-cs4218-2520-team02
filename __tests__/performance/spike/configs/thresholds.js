// Yap Zhao Yi, A0277540B
import { createSpikeStages } from "./stages.js";
import { getNumberEnv } from "../helpers/env.js";

export function createSpikeThresholds() {
  return {
    http_req_duration: [
      `p(90)<${getNumberEnv("P90_THRESHOLD_MS", 2000)}`,
      `p(95)<${getNumberEnv("P95_THRESHOLD_MS", 3000)}`,
    ],
    http_req_failed: [`rate<${getNumberEnv("HTTP_ERROR_RATE_THRESHOLD", 0.1)}`],
    business_error_rate: [`rate<${getNumberEnv("BUSINESS_ERROR_RATE_THRESHOLD", 0.1)}`],
    transaction_success_rate: [
      `rate>${getNumberEnv("TRANSACTION_SUCCESS_RATE_THRESHOLD", 0.9)}`,
    ],
    checks: [`rate>${getNumberEnv("CHECK_SUCCESS_RATE_THRESHOLD", 0.9)}`],
  };
}

export function createSpikeTags(tags = {}) {
  return {
    test_type: "performance",
    performance_mode: "spike",
    ...tags,
  };
}

export function createSpikeOptions(tags = {}, overrides = {}) {
  const options = {
    thresholds: createSpikeThresholds(),
    summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "max"],
    tags: createSpikeTags(tags),
    userAgent: "k6-spike-suite",
  };

  if (!overrides.scenarios) {
    options.stages = createSpikeStages();
  }

  if (overrides.tags) {
    options.tags = {
      ...options.tags,
      ...overrides.tags,
    };
  }

  return {
    ...options,
    ...overrides,
    tags: options.tags,
  };
}
