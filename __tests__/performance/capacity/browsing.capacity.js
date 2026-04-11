// Gavin Sin Fu Chen, A0273285X
import http from "k6/http";
import { sleep } from "k6";
import {
  getBaseUrl,
  getBooleanEnv,
  getNumberEnv,
  getStringListEnv,
} from "../common/k6/env.js";
import { pickByIteration } from "../common/k6/metrics.js";
import {
  PRICE_RANGES,
  SEARCH_KEYWORDS,
  buildProductFilterPayload,
} from "../common/k6/payloads.js";
import {
  markFailedCapacityJourney,
  recordCapacityTransaction,
  trackCapacityResponse,
} from "./helpers/breachMarkers.js";
import { createCapacityOptions } from "./configs/thresholds.js";

const baseUrl = getBaseUrl();
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

export const options = createCapacityOptions(
  { flow: "browsing" },
  { startVUs: 25, stepVUs: 25, maxVUs: 250, rampDuration: "20s", holdDuration: "1m" }
);

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
  const iteration = __ITER;
  const requestName = pickByIteration(requestMix, iteration);
  const success = runCapacityRequest(requestName, data, iteration);

  if (!success) {
    markFailedCapacityJourney(requestName, {
      flow: "browsing",
      action: requestName,
    });
  }

  recordCapacityTransaction(success, {
    flow: "browsing",
    journey: requestName,
  });

  sleep(getNumberEnv("CAPACITY_THINK_TIME_SECONDS", 0.5));
}
