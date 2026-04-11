import { createLoadStages } from "./stages.js";
import { getNumberEnv } from "../../common/k6/env.js";

export function createLoadThresholds() {
  return {
    http_req_duration: [
      `p(90)<${getNumberEnv("LOAD_P90_THRESHOLD_MS", 800)}`,
      `p(95)<${getNumberEnv("LOAD_P95_THRESHOLD_MS", 1000)}`,
    ],
    http_req_failed: [`rate<${getNumberEnv("LOAD_HTTP_ERROR_RATE_THRESHOLD", 0.05)}`],
    business_error_rate: [`rate<${getNumberEnv("LOAD_BUSINESS_ERROR_RATE_THRESHOLD", 0.05)}`],
    transaction_success_rate: [
      `rate>${getNumberEnv("LOAD_TRANSACTION_SUCCESS_RATE_THRESHOLD", 0.95)}`,
    ],
    checks: [`rate>${getNumberEnv("LOAD_CHECK_SUCCESS_RATE_THRESHOLD", 0.95)}`],
  };
}

export function createLoadTags(tags = {}) {
  return {
    test_type: "performance",
    performance_mode: "load",
    ...tags,
  };
}

export function createLoadOptions(tags = {}, overrides = {}) {
  const options = {
    thresholds: createLoadThresholds(),
    summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "max"],
    tags: createLoadTags(tags),
    userAgent: "k6-load-suite",
  };

  if (!overrides.scenarios) {
    options.stages = createLoadStages();
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
