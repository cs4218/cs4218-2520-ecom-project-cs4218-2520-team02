// Gavin Sin Fu Chen, A0273285X
import exec from "k6/execution";
import { sleep } from "k6";
import { Counter } from "k6/metrics";
import {
  buildUniqueUser,
  getStressUserPool,
  loginUser,
  pickUserForVu,
  registerUser,
} from "./helpers/auth.js";
import {
  getBooleanEnv,
  getNumberEnv,
  getOptionalEnv,
  getStringListEnv,
} from "./helpers/env.js";
import { pickByIteration, recordTransaction } from "./helpers/metrics.js";

const capacityThresholdBreaches = new Counter("capacity_threshold_breaches");
const capacityBreachCounters = {
  business_error_rate: new Counter("capacity_business_error_rate_breaches"),
  checks: new Counter("capacity_check_breaches"),
  endpoint_duration_p90: new Counter("capacity_endpoint_duration_p90_breaches"),
  endpoint_duration_p95: new Counter("capacity_endpoint_duration_p95_breaches"),
  failed_transactions: new Counter("capacity_failed_transaction_breaches"),
  http_req_duration_p90: new Counter("capacity_http_req_duration_p90_breaches"),
  http_req_duration_p95: new Counter("capacity_http_req_duration_p95_breaches"),
  http_req_duration_p99: new Counter("capacity_http_req_duration_p99_breaches"),
  http_req_failed: new Counter("capacity_http_req_failed_breaches"),
  transaction_success_rate: new Counter("capacity_transaction_success_rate_breaches"),
};

const capacityThresholds = {
  httpReqP90Ms: getNumberEnv("CAPACITY_HTTP_P90_THRESHOLD_MS", 1000),
  httpReqP95Ms: getNumberEnv("CAPACITY_HTTP_P95_THRESHOLD_MS", 1500),
  httpReqP99Ms: getNumberEnv("CAPACITY_HTTP_P99_THRESHOLD_MS", 2500),
  endpointP90Ms: getNumberEnv("CAPACITY_ENDPOINT_P90_THRESHOLD_MS", 900),
  endpointP95Ms: getNumberEnv("CAPACITY_ENDPOINT_P95_THRESHOLD_MS", 1200),
  httpErrorRate: getNumberEnv("CAPACITY_HTTP_ERROR_RATE_THRESHOLD", 0.02),
  businessErrorRate: getNumberEnv("CAPACITY_BUSINESS_ERROR_RATE_THRESHOLD", 0.02),
  transactionSuccessRate: getNumberEnv("CAPACITY_TRANSACTION_SUCCESS_RATE_THRESHOLD", 0.98),
  checkSuccessRate: getNumberEnv("CAPACITY_CHECK_SUCCESS_RATE_THRESHOLD", 0.98),
};

const DEFAULT_AUTH_REQUEST_MIX = ["register", "login", "login"];
const SUPPORTED_AUTH_REQUESTS = new Set(["register", "login"]);
const authRequestMix = resolveAuthRequestMix();

export const options = {
  stages: createCapacityStages(),
  thresholds: createCapacityThresholds(),
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
  tags: {
    test_type: "performance",
    performance_mode: "capacity",
    flow: "auth",
  },
  userAgent: "k6-capacity-suite",
};

function thresholdConfig(expression) {
  return {
    threshold: expression,
    abortOnFail: getBooleanEnv("CAPACITY_ABORT_ON_THRESHOLD", false),
    delayAbortEval: getOptionalEnv("CAPACITY_ABORT_DELAY", "1m"),
  };
}

function createCapacityThresholds() {
  const maxFailedTransactions = getNumberEnv("CAPACITY_MAX_FAILED_TRANSACTIONS", 0);

  return {
    http_req_duration: [
      thresholdConfig(`p(90)<${capacityThresholds.httpReqP90Ms}`),
      thresholdConfig(`p(95)<${capacityThresholds.httpReqP95Ms}`),
      thresholdConfig(`p(99)<${capacityThresholds.httpReqP99Ms}`),
    ],
    endpoint_duration: [
      thresholdConfig(`p(90)<${capacityThresholds.endpointP90Ms}`),
      thresholdConfig(`p(95)<${capacityThresholds.endpointP95Ms}`),
    ],
    http_req_failed: [
      thresholdConfig(`rate<${capacityThresholds.httpErrorRate}`),
    ],
    business_error_rate: [
      thresholdConfig(`rate<${capacityThresholds.businessErrorRate}`),
    ],
    transaction_success_rate: [
      thresholdConfig(`rate>${capacityThresholds.transactionSuccessRate}`),
    ],
    checks: [
      thresholdConfig(`rate>${capacityThresholds.checkSuccessRate}`),
    ],
    completed_transactions: [
      `count>${getNumberEnv("CAPACITY_MIN_COMPLETED_TRANSACTIONS", 0)}`,
    ],
    failed_transactions: [
      thresholdConfig(`count<${Math.max(0, maxFailedTransactions) + 1}`),
    ],
  };
}

function createCapacityStages() {
  const startUsers = Math.max(1, getNumberEnv("CAPACITY_START_VUS", 50));
  const stepUsers = Math.max(1, getNumberEnv("CAPACITY_STEP_VUS", 50));
  const maxUsers = Math.max(startUsers, getNumberEnv("CAPACITY_MAX_VUS", 250));
  const rampDuration = getOptionalEnv("CAPACITY_RAMP_DURATION", "20s");
  const holdDuration = getOptionalEnv("CAPACITY_HOLD_DURATION", "30s");
  const cooldownDuration = getOptionalEnv("CAPACITY_COOLDOWN_DURATION", "20s");
  const stages = [];

  for (let target = startUsers; target <= maxUsers; target += stepUsers) {
    stages.push({ duration: rampDuration, target });
    stages.push({ duration: holdDuration, target });
  }

  stages.push({ duration: cooldownDuration, target: 0 });
  return stages;
}

function resolveAuthRequestMix() {
  const configuredRequests = getStringListEnv(
    "CAPACITY_AUTH_REQUESTS",
    DEFAULT_AUTH_REQUEST_MIX
  );
  const requests = configuredRequests.filter((request) =>
    SUPPORTED_AUTH_REQUESTS.has(request)
  );

  if (requests.length === 0) {
    return DEFAULT_AUTH_REQUEST_MIX;
  }

  return requests;
}

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

function markCapacityThresholdBreach(metric, details = {}, tags = {}, dashboardMetric = metric) {
  const markerTags = {
    metric,
    dashboard_metric: dashboardMetric,
    endpoint: tags.endpoint || details.endpoint || "unknown",
    action: tags.action || details.action || "unknown",
  };

  capacityThresholdBreaches.add(1, markerTags);
  capacityBreachCounters[dashboardMetric]?.add(1, markerTags);

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

function markResponseBreaches(response, result, options = {}) {
  const { name = "unnamed", expectedStatuses = [200], requireSuccess = false, tags = {} } = options;
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

  if (durationMs > capacityThresholds.endpointP90Ms) {
    markCapacityThresholdBreach(
      "endpoint_duration",
      {
        ...commonDetails,
        threshold: `sample>${capacityThresholds.endpointP90Ms}ms`,
      },
      tags,
      "endpoint_duration_p90"
    );
  }

  if (durationMs > capacityThresholds.endpointP95Ms) {
    markCapacityThresholdBreach(
      "endpoint_duration",
      {
        ...commonDetails,
        threshold: `sample>${capacityThresholds.endpointP95Ms}ms`,
      },
      tags,
      "endpoint_duration_p95"
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

function markFailedAuthJourney(endpoint, tags = {}) {
  markCapacityThresholdBreach(
    "transaction_success_rate",
    {
      endpoint,
      threshold: `rate>${capacityThresholds.transactionSuccessRate}`,
    },
    { flow: "auth", action: endpoint, ...tags }
  );
  markCapacityThresholdBreach(
    "failed_transactions",
    {
      endpoint,
      threshold: `count<${getNumberEnv("CAPACITY_MAX_FAILED_TRANSACTIONS", 0) + 1}`,
    },
    { flow: "auth", action: endpoint, ...tags }
  );
}

export function setup() {
  const loginUsers = getStressUserPool();

  if (loginUsers.length === 0) {
    throw new Error("Auth capacity test requires at least one seeded login user.");
  }

  return { loginUsers };
}

function registerCapacityUser() {
  const user = buildUniqueUser();
  const registerResult = registerUser(user, {
    auth_scenario: "registration",
    performance_mode: "capacity",
  });

  markResponseBreaches(registerResult.response, registerResult, {
    name: "capacity_auth_register",
    expectedStatuses: [201],
    requireSuccess: true,
    tags: {
      flow: "auth",
      action: "register",
      auth_scenario: "registration",
    },
  });

  return registerResult.ok;
}

function loginCapacityUser(data) {
  const user = pickUserForVu(data.loginUsers);
  const loginResult = loginUser(user.email, user.password, {
    auth_scenario: "login",
    performance_mode: "capacity",
    user_label: user.label,
  });

  markResponseBreaches(loginResult.response, loginResult, {
    name: "capacity_auth_login",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: {
      flow: "auth",
      action: "login",
      auth_scenario: "login",
      user_label: user.label,
    },
  });

  return loginResult.ok;
}

function runAuthRequest(requestName, data) {
  switch (requestName) {
    case "register":
      return registerCapacityUser();
    case "login":
      return loginCapacityUser(data);
    default:
      return false;
  }
}

export default function (data) {
  const iteration = exec.scenario.iterationInTest;
  const requestName = pickByIteration(authRequestMix, iteration);
  const success = runAuthRequest(requestName, data);

  if (!success) {
    markFailedAuthJourney(requestName, { auth_scenario: requestName });
  }

  recordTransaction(success, {
    flow: "auth",
    auth_scenario: requestName,
  });

  sleep(getNumberEnv("CAPACITY_THINK_TIME_SECONDS", 0.5));
}
