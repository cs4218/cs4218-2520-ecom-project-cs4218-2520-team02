// Gavin Sin Fu Chen, A0273285X
import exec from "k6/execution";
import { Counter } from "k6/metrics";
import { getBooleanEnv } from "../../common/k6/env.js";
import {
  trackResponse,
  transactionSuccessRate,
} from "../../common/k6/metrics.js";
import { getCapacityThresholdValues } from "../configs/thresholds.js";

const capacityThresholdBreaches = new Counter("capacity_threshold_breaches");
const thresholdMarkerCounters = {
  business_error_rate: new Counter("capacity_business_error_rate_breaches"),
  checks: new Counter("capacity_check_breaches"),
  http_req_duration_p90: new Counter("capacity_http_req_duration_p90_breaches"),
  http_req_duration_p95: new Counter("capacity_http_req_duration_p95_breaches"),
  http_req_duration_p99: new Counter("capacity_http_req_duration_p99_breaches"),
  http_req_failed: new Counter("capacity_http_req_failed_breaches"),
  transaction_success_rate: new Counter("capacity_transaction_success_rate_breaches"),
};

export const capacityThresholds = getCapacityThresholdValues();

function getElapsedSeconds() {
  return ((exec.instance.currentTestRunDuration || 0) / 1000).toFixed(1);
}

function getActiveVus() {
  return exec.instance.vusActive || 0;
}

function getIterationLabel() {
  try {
    return exec.scenario.iterationInTest;
  } catch (error) {
    return "setup";
  }
}

export function markCapacityThresholdBreach(
  metric,
  details = {},
  tags = {},
  dashboardMetric = metric
) {
  const markerTags = {
    metric,
    dashboard_metric: dashboardMetric,
    endpoint: tags.endpoint || details.endpoint || "unknown",
    action: tags.action || details.action || "unknown",
  };

  capacityThresholdBreaches.add(1, markerTags);
  thresholdMarkerCounters[dashboardMetric]?.add(1, markerTags);

  if (!getBooleanEnv("CAPACITY_LOG_THRESHOLD_BREACHES", true)) {
    return;
  }

  const detailText = Object.entries(details)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");

  console.warn(
    `[capacity-threshold-breach] elapsed=${getElapsedSeconds()}s vus=${getActiveVus()} ` +
      `iteration=${getIterationLabel()} metric=${metric} ${detailText}`
  );
}

export function markResponseBreaches(response, result, options = {}) {
  const {
    name = "unnamed",
    expectedStatuses = [200],
    requireSuccess = false,
    tags = {},
  } = options;
  const durationMs = response?.timings?.duration || 0;
  const status = response?.status || 0;
  const commonDetails = {
    endpoint: name,
    status,
    duration_ms: durationMs.toFixed(2),
  };

  if (!expectedStatuses.includes(status)) {
    markCapacityThresholdBreach(
      "http_req_failed",
      {
        ...commonDetails,
        threshold: `rate<${capacityThresholds.httpErrorRate}`,
      },
      tags
    );
    markCapacityThresholdBreach(
      "checks",
      {
        ...commonDetails,
        check: "expected_status",
        threshold: `rate>${capacityThresholds.checkSuccessRate}`,
      },
      tags
    );
  }

  if (requireSuccess && result.body?.success !== true) {
    markCapacityThresholdBreach(
      "business_error_rate",
      {
        ...commonDetails,
        threshold: `rate<${capacityThresholds.businessErrorRate}`,
      },
      tags
    );
    markCapacityThresholdBreach(
      "checks",
      {
        ...commonDetails,
        check: "success_true",
        threshold: `rate>${capacityThresholds.checkSuccessRate}`,
      },
      tags
    );
  }

  if (durationMs > capacityThresholds.httpReqP90Ms) {
    markCapacityThresholdBreach(
      "http_req_duration",
      {
        ...commonDetails,
        threshold: `sample>${capacityThresholds.httpReqP90Ms}ms`,
      },
      tags,
      "http_req_duration_p90"
    );
  }

  if (durationMs > capacityThresholds.httpReqP95Ms) {
    markCapacityThresholdBreach(
      "http_req_duration",
      {
        ...commonDetails,
        threshold: `sample>${capacityThresholds.httpReqP95Ms}ms`,
      },
      tags,
      "http_req_duration_p95"
    );
  }

  if (durationMs > capacityThresholds.httpReqP99Ms) {
    markCapacityThresholdBreach(
      "http_req_duration",
      {
        ...commonDetails,
        threshold: `sample>${capacityThresholds.httpReqP99Ms}ms`,
      },
      tags,
      "http_req_duration_p99"
    );
  }
}

export function trackCapacityResponse(response, options = {}) {
  const result = trackResponse(response, options);
  markResponseBreaches(response, result, options);
  return result;
}

export function recordCapacityTransaction(success, tags = {}) {
  transactionSuccessRate.add(success ? 1 : 0, tags);
}

export function markFailedCapacityJourney(endpoint, tags = {}) {
  markCapacityThresholdBreach(
    "transaction_success_rate",
    {
      endpoint,
      threshold: `rate>${capacityThresholds.transactionSuccessRate}`,
    },
    {
      action: endpoint,
      ...tags,
    }
  );
}
