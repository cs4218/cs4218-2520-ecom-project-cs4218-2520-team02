// Gavin Sin Fu Chen, A0273285X
import http from "k6/http";
import exec from "k6/execution";
import { sleep } from "k6";
import { Counter } from "k6/metrics";
import {
  getBaseUrl,
  getBooleanEnv,
  getNumberEnv,
  getOptionalEnv,
  getStringListEnv,
} from "./helpers/env.js";
import { pickByIteration, recordTransaction, trackResponse } from "./helpers/metrics.js";
import {
  PRICE_RANGES,
  SEARCH_KEYWORDS,
  buildProductFilterPayload,
} from "./helpers/payloads.js";

const baseUrl = getBaseUrl();
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
const DEFAULT_REQUEST_MIX = [
  "hot_product",
  "hot_product",
  "home",
  "search",
  "filter",
  "category",
  "load_more",
  "related",
];
const SUPPORTED_REQUESTS = new Set([
  "home",
  "search",
  "filter",
  "category",
  "load_more",
  "hot_product",
  "related",
  "photo",
]);
const requestMix = resolveRequestMix();

export const options = {
  stages: createCapacityStages(),
  thresholds: createCapacityThresholds(),
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
  tags: {
    test_type: "performance",
    performance_mode: "capacity",
    flow: "browsing",
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

function resolveRequestMix() {
  const configuredRequests = getStringListEnv(
    "CAPACITY_BROWSING_REQUESTS",
    DEFAULT_REQUEST_MIX
  );
  const requests = configuredRequests.filter((request) =>
    SUPPORTED_REQUESTS.has(request)
  );

  if (requests.length === 0) {
    return DEFAULT_REQUEST_MIX;
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

function trackCapacityResponse(response, options = {}) {
  const result = trackResponse(response, options);
  markResponseBreaches(response, result, options);
  return result;
}

export function setup() {
  const categoriesResponse = http.get(`${baseUrl}/api/v1/category/get-category`, {
    tags: { flow: "browsing", action: "get_categories" },
  });
  const categoriesResult = trackCapacityResponse(categoriesResponse, {
    name: "capacity_get_categories",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "get_categories" },
  });

  const productsResponse = http.get(`${baseUrl}/api/v1/product/product-list/1`, {
    tags: { flow: "browsing", action: "get_product_list" },
  });
  const productsResult = trackCapacityResponse(productsResponse, {
    name: "capacity_product_list_page_1",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "get_product_list" },
  });

  const categories = categoriesResult.body?.categories || [];
  const products = productsResult.body?.products || [];

  if (categories.length === 0) {
    throw new Error("Browsing capacity test requires at least one category.");
  }

  if (products.length === 0) {
    throw new Error("Browsing capacity test requires at least one product.");
  }

  return {
    categories,
    products,
    popularProducts: selectPopularProducts(products),
  };
}

function selectPopularProducts(products) {
  const configuredSlugs = getStringListEnv("POPULAR_PRODUCT_SLUGS", []);
  if (configuredSlugs.length > 0) {
    const selectedProducts = products.filter((product) =>
      configuredSlugs.includes(product.slug)
    );

    if (selectedProducts.length > 0) {
      return selectedProducts;
    }
  }

  return products.slice(0, Math.max(1, getNumberEnv("POPULAR_PRODUCT_COUNT", 3)));
}

function fetchHomePagePayloads() {
  const productListResponse = http.get(`${baseUrl}/api/v1/product/product-list/1`, {
    tags: { flow: "browsing", action: "home_product_list" },
  });
  const productCountResponse = http.get(`${baseUrl}/api/v1/product/product-count`, {
    tags: { flow: "browsing", action: "home_product_count" },
  });

  const productListResult = trackCapacityResponse(productListResponse, {
    name: "capacity_home_product_list",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "home_product_list" },
  });

  const productCountResult = trackCapacityResponse(productCountResponse, {
    name: "capacity_home_product_count",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "home_product_count" },
  });

  return productListResult.ok && productCountResult.ok;
}

function searchProducts(keyword) {
  const response = http.get(`${baseUrl}/api/v1/product/search/${encodeURIComponent(keyword)}`, {
    tags: { flow: "browsing", action: "search" },
  });
  return trackCapacityResponse(response, {
    name: "capacity_search",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "search" },
  });
}

function filterProducts(categoryId, priceRange) {
  const response = http.post(
    `${baseUrl}/api/v1/product/product-filters`,
    JSON.stringify(buildProductFilterPayload(categoryId, priceRange)),
    {
      headers: { "Content-Type": "application/json" },
      tags: { flow: "browsing", action: "filter" },
    }
  );

  return trackCapacityResponse(response, {
    name: "capacity_filter",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "filter" },
  });
}

function loadMoreProducts(page) {
  const response = http.get(`${baseUrl}/api/v1/product/product-list/${page}`, {
    tags: { flow: "browsing", action: "load_more" },
  });
  return trackCapacityResponse(response, {
    name: "capacity_load_more",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "load_more" },
  });
}

function loadCategoryPage(category) {
  if (!category?.slug) {
    return { ok: false };
  }

  const response = http.get(`${baseUrl}/api/v1/product/product-category/${category.slug}`, {
    tags: { flow: "browsing", action: "category_page" },
  });
  return trackCapacityResponse(response, {
    name: "capacity_category_page",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "category_page" },
  });
}

function loadProductDetails(product) {
  if (!product?.slug) {
    return { ok: false };
  }

  const response = http.get(`${baseUrl}/api/v1/product/get-product/${product.slug}`, {
    tags: { flow: "browsing", action: "hot_product_details" },
  });
  return trackCapacityResponse(response, {
    name: "capacity_hot_product_details",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "hot_product_details" },
  });
}

function loadRelatedProducts(product) {
  const categoryId =
    typeof product?.category === "object" ? product.category?._id : product?.category;

  if (!product?._id || !categoryId) {
    return { ok: false };
  }

  const response = http.get(
    `${baseUrl}/api/v1/product/related-product/${product._id}/${categoryId}`,
    {
      tags: { flow: "browsing", action: "related_products" },
    }
  );
  return trackCapacityResponse(response, {
    name: "capacity_related_products",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "related_products" },
  });
}

function loadProductPhoto(product) {
  if (!product?._id) {
    return { ok: false };
  }

  const response = http.get(`${baseUrl}/api/v1/product/product-photo/${product._id}`, {
    tags: { flow: "browsing", action: "product_photo" },
  });
  return trackCapacityResponse(response, {
    name: "capacity_product_photo",
    expectedStatuses: [200, 404],
    requireSuccess: false,
    tags: { flow: "browsing", action: "product_photo" },
  });
}

function runSearchJourney(keyword) {
  let ok = fetchHomePagePayloads();
  ok = searchProducts(keyword).ok && ok;
  return ok;
}

function runFilterJourney(category, priceRange) {
  let ok = fetchHomePagePayloads();
  ok = filterProducts(category?._id, priceRange).ok && ok;
  ok = loadMoreProducts(2).ok && ok;
  return ok;
}

function runCategoryJourney(category) {
  let ok = fetchHomePagePayloads();
  ok = loadCategoryPage(category).ok && ok;
  return ok;
}

function runHotProductJourney(product) {
  let ok = loadProductDetails(product).ok;

  if (getBooleanEnv("CAPACITY_INCLUDE_RELATED_PRODUCTS", true)) {
    ok = loadRelatedProducts(product).ok && ok;
  }

  if (getBooleanEnv("INCLUDE_PRODUCT_PHOTOS", false)) {
    ok = loadProductPhoto(product).ok && ok;
  }

  return ok;
}

function runCapacityRequest(requestName, data, iteration) {
  const category = pickByIteration(data.categories, iteration);
  const product = pickByIteration(data.products, iteration);
  const popularProduct = pickByIteration(data.popularProducts, iteration);
  const keyword = pickByIteration(SEARCH_KEYWORDS, iteration) || "phone";
  const priceRange = pickByIteration(PRICE_RANGES, iteration) || [0, 50];
  const page = (iteration % 2) + 2;

  switch (requestName) {
    case "home":
      return fetchHomePagePayloads();
    case "search":
      return searchProducts(keyword).ok;
    case "filter":
      return runFilterJourney(category, priceRange);
    case "category":
      return runCategoryJourney(category);
    case "load_more":
      return loadMoreProducts(page).ok;
    case "hot_product":
      return runHotProductJourney(popularProduct);
    case "related":
      return loadRelatedProducts(popularProduct).ok;
    case "photo":
      return loadProductPhoto(product).ok;
    default:
      return false;
  }
}

export default function (data) {
  const iteration = exec.scenario.iterationInTest;
  const requestName = pickByIteration(requestMix, iteration);
  const success = runCapacityRequest(requestName, data, iteration);

  if (!success) {
    markCapacityThresholdBreach(
      "transaction_success_rate",
      {
        endpoint: requestName,
        threshold: `rate>${capacityThresholds.transactionSuccessRate}`,
      },
      { flow: "browsing", action: requestName }
    );
    markCapacityThresholdBreach(
      "failed_transactions",
      {
        endpoint: requestName,
        threshold: `count<${getNumberEnv("CAPACITY_MAX_FAILED_TRANSACTIONS", 0) + 1}`,
      },
      { flow: "browsing", action: requestName }
    );
  }

  recordTransaction(success, {
    flow: "browsing",
    journey: requestName,
  });

  sleep(getNumberEnv("CAPACITY_THINK_TIME_SECONDS", 0.5));
}
