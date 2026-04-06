// Yap Zhao Yi, A0277540B
import http from "k6/http";
import exec from "k6/execution";
import { sleep } from "k6";
import { createSpikeOptions } from "./configs/thresholds.js";
import { getBaseUrl, getBooleanEnv, getNumberEnv } from "./helpers/env.js";
import { pickByIteration, recordTransaction, trackResponse } from "./helpers/metrics.js";
import {
  SEARCH_KEYWORDS,
  PRICE_RANGES,
  buildProductFilterPayload,
} from "./helpers/payloads.js";

const baseUrl = getBaseUrl();

export const options = createSpikeOptions({ flow: "browsing" });

export function setup() {
  const categoriesResponse = http.get(`${baseUrl}/api/v1/category/get-category`, {
    tags: { flow: "browsing", action: "get_categories" },
  });
  const categoriesResult = trackResponse(categoriesResponse, {
    name: "browse_get_categories",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "get_categories" },
  });

  const productsResponse = http.get(`${baseUrl}/api/v1/product/product-list/1`, {
    tags: { flow: "browsing", action: "get_product_list" },
  });
  const productsResult = trackResponse(productsResponse, {
    name: "browse_product_list_page_1",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "get_product_list" },
  });

  if ((categoriesResult.body?.categories || []).length === 0) {
    throw new Error("Browsing spike test requires at least one category.");
  }

  if ((productsResult.body?.products || []).length === 0) {
    throw new Error("Browsing spike test requires at least one product.");
  }

  return {
    categories: categoriesResult.body?.categories || [],
    products: productsResult.body?.products || [],
  };
}

function fetchHomePagePayloads() {
  const productListResponse = http.get(`${baseUrl}/api/v1/product/product-list/1`, {
    tags: { flow: "browsing", action: "home_product_list" },
  });
  const productCountResponse = http.get(`${baseUrl}/api/v1/product/product-count`, {
    tags: { flow: "browsing", action: "home_product_count" },
  });

  const productListResult = trackResponse(productListResponse, {
    name: "browse_home_product_list",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "home_product_list" },
  });

  const productCountResult = trackResponse(productCountResponse, {
    name: "browse_home_product_count",
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
  return trackResponse(response, {
    name: "browse_search",
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

  return trackResponse(response, {
    name: "browse_filter",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "filter" },
  });
}

function loadMoreProducts(page) {
  const response = http.get(`${baseUrl}/api/v1/product/product-list/${page}`, {
    tags: { flow: "browsing", action: "load_more" },
  });
  return trackResponse(response, {
    name: "browse_load_more",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "load_more" },
  });
}

function loadCategoryPage(category) {
  if (!category?.slug) {
    return;
  }

  const response = http.get(`${baseUrl}/api/v1/product/product-category/${category.slug}`, {
    tags: { flow: "browsing", action: "category_page" },
  });
  return trackResponse(response, {
    name: "browse_category_page",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "browsing", action: "category_page" },
  });
}

function loadProductPhoto(product) {
  if (!product?._id) {
    return;
  }

  const response = http.get(`${baseUrl}/api/v1/product/product-photo/${product._id}`, {
    tags: { flow: "browsing", action: "product_photo" },
  });
  return trackResponse(response, {
    name: "browse_product_photo",
    expectedStatuses: [200, 404],
    requireSuccess: false,
    tags: { flow: "browsing", action: "product_photo" },
  });
}

function runSearchJourney(keyword, product) {
  let ok = fetchHomePagePayloads();
  ok = searchProducts(keyword).ok && ok;

  if (getBooleanEnv("INCLUDE_PRODUCT_PHOTOS", false) && product?._id) {
    ok = loadProductPhoto(product).ok && ok;
  }

  return ok;
}

function runFilterJourney(category, priceRange) {
  let ok = fetchHomePagePayloads();
  ok = filterProducts(category?._id, priceRange).ok && ok;
  ok = loadMoreProducts(2).ok && ok;
  return ok;
}

function runCategoryJourney(category, product) {
  let ok = fetchHomePagePayloads();
  const categoryResult = loadCategoryPage(category);
  ok = categoryResult?.ok && ok;

  if (getBooleanEnv("INCLUDE_PRODUCT_PHOTOS", false) && product?._id) {
    ok = loadProductPhoto(product).ok && ok;
  }

  return ok;
}

function runLoadMoreJourney(page) {
  let ok = fetchHomePagePayloads();
  ok = loadMoreProducts(page).ok && ok;
  return ok;
}

export default function (data) {
  const iteration = exec.scenario.iterationInTest;
  const category = pickByIteration(data.categories, iteration);
  const product = pickByIteration(data.products, iteration);
  const keyword = pickByIteration(SEARCH_KEYWORDS, iteration) || "phone";
  const priceRange = pickByIteration(PRICE_RANGES, iteration) || [0, 50];
  const page = (iteration % 2) + 2;

  let success = false;

  switch (iteration % 4) {
    case 0:
      success = runSearchJourney(keyword, product);
      break;
    case 1:
      success = runFilterJourney(category, priceRange);
      break;
    case 2:
      success = runCategoryJourney(category, product);
      break;
    default:
      success = runLoadMoreJourney(page);
      break;
  }

  recordTransaction(success, {
    flow: "browsing",
    journey: ["search", "filter", "category", "load_more"][iteration % 4],
  });

  sleep(getNumberEnv("THINK_TIME_SECONDS", 1));
}
