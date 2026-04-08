// Capacity test for payment token retrieval and checkout submission.
import http from "k6/http";
import exec from "k6/execution";
import { sleep } from "k6";
import { Counter } from "k6/metrics";
import { buildAuthHeaders, getStressUserPool, loginUser, pickUserForVu } from "./helpers/auth.js";
import {
  getBaseUrl,
  getBooleanEnv,
  getNumberEnv,
  getOptionalEnv,
} from "./helpers/env.js";
import { recordTransaction, trackResponse } from "./helpers/metrics.js";
import { buildCart } from "./helpers/payloads.js";

const baseUrl = getBaseUrl();
let cachedSession = null;

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

export const options = {
  stages: createCapacityStages(),
  thresholds: createCapacityThresholds(),
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
  tags: {
    test_type: "performance",
    performance_mode: "capacity",
    flow: "payment",
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

function trackCapacityResponse(response, options = {}) {
  const result = trackResponse(response, options);
  markResponseBreaches(response, result, options);
  return result;
}

function markFailedPaymentJourney(endpoint, user) {
  markCapacityThresholdBreach(
    "transaction_success_rate",
    {
      endpoint,
      threshold: `rate>${capacityThresholds.transactionSuccessRate}`,
    },
    { flow: "payment", action: endpoint, user_label: user?.label }
  );
  markCapacityThresholdBreach(
    "failed_transactions",
    {
      endpoint,
      threshold: `count<${getNumberEnv("CAPACITY_MAX_FAILED_TRANSACTIONS", 0) + 1}`,
    },
    { flow: "payment", action: endpoint, user_label: user?.label }
  );
}

function loginCapacityUser(user, phase) {
  const loginResult = loginUser(user.email, user.password, {
    phase,
    user_label: user.label,
  });

  markResponseBreaches(loginResult.response, loginResult, {
    name: "capacity_payment_login",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "payment", action: "login", phase, user_label: user.label },
  });

  return loginResult;
}

function getBraintreeToken() {
  const response = http.get(`${baseUrl}/api/v1/product/braintree/token`, {
    tags: { flow: "payment", action: "get_braintree_token" },
  });

  return trackCapacityResponse(response, {
    name: "capacity_payment_get_braintree_token",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "payment", action: "get_braintree_token" },
  });
}

function submitPayment(token, products) {
  const cartSize = getNumberEnv("PAYMENT_CART_SIZE", 2);
  const cart = buildCart(products, cartSize);
  const paymentNonce = getOptionalEnv("PAYMENT_NONCE", "fake-valid-nonce");
  const response = http.post(
    `${baseUrl}/api/v1/product/braintree/payment`,
    JSON.stringify({
      nonce: paymentNonce,
      cart,
    }),
    {
      headers: buildAuthHeaders(token),
      tags: { flow: "payment", action: "submit_payment" },
    }
  );

  return trackCapacityResponse(response, {
    name: "capacity_payment_submit",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "payment", action: "submit_payment" },
  });
}

export function setup() {
  const users = getStressUserPool();
  const validUsers = [];

  for (const user of users) {
    const loginResult = loginCapacityUser(user, "setup");
    if (loginResult.ok && loginResult.token) {
      validUsers.push(user);
    }
  }

  if (validUsers.length === 0) {
    throw new Error("Payment capacity test requires at least one user with valid login credentials.");
  }

  const productsResponse = http.get(`${baseUrl}/api/v1/product/product-list/1`, {
    tags: { flow: "payment", action: "get_products" },
  });
  const productsResult = trackCapacityResponse(productsResponse, {
    name: "capacity_payment_get_products",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "payment", action: "get_products" },
  });

  const products = productsResult.body?.products || [];
  if (products.length === 0) {
    throw new Error("The payment capacity test needs at least one product in the catalogue.");
  }

  return {
    users: validUsers,
    products,
  };
}

function ensureSession(user) {
  if (cachedSession && cachedSession.label === user.label) {
    return cachedSession;
  }

  const loginResult = loginCapacityUser(user, "vu_session");
  if (!loginResult.ok || !loginResult.token) {
    return null;
  }

  cachedSession = {
    label: user.label,
    token: loginResult.token,
  };

  return cachedSession;
}

export default function (data) {
  const user = pickUserForVu(data.users);
  const session = ensureSession(user);
  let success = false;

  if (session) {
    const tokenResult = getBraintreeToken();
    const paymentResult = submitPayment(session.token, data.products);
    success = tokenResult.ok && paymentResult.ok;
  }

  if (!success) {
    markFailedPaymentJourney("submit_payment", user);
  }

  recordTransaction(success, {
    flow: "payment",
    journey: "submit_payment",
    user_label: user.label,
  });

  sleep(getNumberEnv("CAPACITY_THINK_TIME_SECONDS", 0.5));
}
