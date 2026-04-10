// Yap Zhao Yi, A0277540B
import { createSpikeStages } from "./stages.js";
import { getNumberEnv, getRequiredEnv } from "../../common/k6/env.js";

export function createSpikeThresholds() {
  const flow = getRequiredEnv("FLOW_TYPE", "auth");
  const p90 = getNumberEnv("P90_THRESHOLD_MS", 800);
  const p95 = getNumberEnv("P95_THRESHOLD_MS", 1000);

  return {
    http_req_duration: [
      `p(90)<${p90}`,
      `p(95)<${p95}`,
    ],
    http_req_failed: [
      `rate<${getNumberEnv("HTTP_ERROR_RATE_THRESHOLD", 0.1)}`
    ],
    business_error_rate: [
      `rate<${getNumberEnv("BUSINESS_ERROR_RATE_THRESHOLD", 0.1)}`
    ],
    transaction_success_rate: [
      `rate>${getNumberEnv("TRANSACTION_SUCCESS_RATE_THRESHOLD", 0.9)}`
    ],
    checks: [
      `rate>${getNumberEnv("CHECK_SUCCESS_RATE_THRESHOLD", 0.9)}`
    ]
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
  // Use explicit scenarios so gracefulStop can be set at the scenario level.
  // The stages shorthand creates an implicit scenario that ignores any top-level
  // gracefulStop, causing k6 to pad endOffset by 30 s and leave a blank gap on
  // every chart. gracefulRampDown is kept at 30 s so in-flight iterations finish
  // cleanly when VUs ramp down from spike back to baseline.
  const scenarios = overrides.scenarios || {
    default: {
      executor: "ramping-vus",
      stages: createSpikeStages(),
      gracefulStop: "0s",
      gracefulRampDown: "30s",
    },
  };

  const options = {
    thresholds: createSpikeThresholds(),
    summaryTrendStats: ["p(90)", "p(95)"],
    tags: createSpikeTags(tags),
    userAgent: "k6-spike-suite",
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
