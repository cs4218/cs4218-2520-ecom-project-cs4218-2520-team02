import { getNumberEnv } from "../../common/k6/env.js";
import { createCapacityStages } from "./stages.js";

export function getCapacityThresholdValues() {
  return {
    httpReqP90Ms: getNumberEnv("CAPACITY_HTTP_P90_THRESHOLD_MS", 1000),
    httpReqP95Ms: getNumberEnv("CAPACITY_HTTP_P95_THRESHOLD_MS", 1500),
    httpReqP99Ms: getNumberEnv("CAPACITY_HTTP_P99_THRESHOLD_MS", 2500),
    httpErrorRate: getNumberEnv("CAPACITY_HTTP_ERROR_RATE_THRESHOLD", 0.1),
    businessErrorRate: getNumberEnv("CAPACITY_BUSINESS_ERROR_RATE_THRESHOLD", 0.1),
    transactionSuccessRate: getNumberEnv("CAPACITY_TRANSACTION_SUCCESS_RATE_THRESHOLD", 0.9),
    checkSuccessRate: getNumberEnv("CAPACITY_CHECK_SUCCESS_RATE_THRESHOLD", 0.9),
  };
}

export function createCapacityThresholds() {
  const values = getCapacityThresholdValues();

  return {
    http_req_duration: [
      `p(90)<${values.httpReqP90Ms}`,
      `p(95)<${values.httpReqP95Ms}`,
      `p(99)<${values.httpReqP99Ms}`,
    ],
    http_req_failed: [
      `rate<${values.httpErrorRate}`,
    ],
    business_error_rate: [
      `rate<${values.businessErrorRate}`,
    ],
    transaction_success_rate: [
      `rate>${values.transactionSuccessRate}`,
    ],
    checks: [
      `rate>${values.checkSuccessRate}`,
    ],
  };
}

export function createCapacityTags(tags = {}) {
  return {
    test_type: "performance",
    performance_mode: "capacity",
    ...tags,
  };
}

export function createCapacityOptions(tags = {}, stageDefaults = {}, overrides = {}) {
  const options = {
    stages: createCapacityStages(stageDefaults),
    thresholds: createCapacityThresholds(),
    summaryTrendStats: ["avg", "p(90)", "p(95)"],
    tags: createCapacityTags(tags),
    userAgent: "k6-capacity-suite",
  };

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
