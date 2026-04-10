import { createStressStages } from "./stages.js";
import { getNumberEnv } from "../../common/k6/env.js";

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
  // Use explicit scenarios so gracefulStop can be set at the scenario level.
  // The stages shorthand creates an implicit scenario that ignores any top-level
  // gracefulStop, causing k6 to pad endOffset by 30 s and leave a blank gap on
  // every chart. gracefulRampDown is kept at 30 s so in-flight iterations finish
  // cleanly when VUs are stepped down between stages.
  const scenarios = overrides.scenarios || {
    default: {
      executor: "ramping-vus",
      stages: createStressStages(),
      gracefulStop: "0s",
      gracefulRampDown: "30s",
    },
  };

  const options = {
    thresholds: createStressThresholds(),
    summaryTrendStats: ["p(90)", "p(95)"],
    tags: createStressTags(tags),
    userAgent: "k6-stress-suite",
    scenarios,
  };

  if (overrides.tags) {
    options.tags = {
      ...options.tags,
      ...overrides.tags,
    };
  }

  return options;
}
