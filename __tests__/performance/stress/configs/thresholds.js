import { createStressStages } from "./stages.js";
import { getNumberEnv } from "../helpers/env.js";

export function createStressThresholds() {
  return {
    http_req_duration: [
      `p(90)<${getNumberEnv("P90_THRESHOLD_MS", 1500)}`,
      `p(95)<${getNumberEnv("P95_THRESHOLD_MS", 2000)}`,
    ],
    http_req_failed: [`rate<${getNumberEnv("HTTP_ERROR_RATE_THRESHOLD", 0.1)}`],
    business_error_rate: [`rate<${getNumberEnv("BUSINESS_ERROR_RATE_THRESHOLD", 0.1)}`],
    transaction_success_rate: [
      `rate>${getNumberEnv("TRANSACTION_SUCCESS_RATE_THRESHOLD", 0.9)}`,
    ],
    checks: [`rate>${getNumberEnv("CHECK_SUCCESS_RATE_THRESHOLD", 0.9)}`],
  };
}

export function createStressTags(tags = {}) {
  return {
    test_type: "performance",
    performance_mode: "stress",
    ...tags,
  };
}

export function createStressOptions(tags = {}, overrides = {}) {
  const options = {
    thresholds: createStressThresholds(),
    summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "max"],
    tags: createStressTags(tags),
    userAgent: "k6-stress-suite",
  };

  if (!overrides.scenarios) {
    options.stages = createStressStages();
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
