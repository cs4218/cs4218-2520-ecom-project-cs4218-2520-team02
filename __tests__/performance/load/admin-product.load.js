// Jovin Ang Yusheng, A0273460H
import http from "k6/http";
import exec from "k6/execution";
import { sleep } from "k6";
import { createLoadOptions } from "./configs/thresholds.js";
import { buildAuthHeaders, getLoadUserPool, loginUser, pickUserForVu } from "./helpers/auth.js";
import { getBaseUrl, getNumberEnv } from "../common/k6/env.js";
import { recordTransaction, trackResponse } from "../common/k6/metrics.js";

const baseUrl = getBaseUrl();
let cachedSession = null;

export const options = createLoadOptions({ flow: "admin-product" });

export function setup() {
  const users = getLoadUserPool();
  if (users.length === 0) {
    throw new Error("Admin product load test requires at least one valid admin user.");
  }

  const validUsers = [];
  for (const user of users) {
    const loginResult = loginUser(user.email, user.password, {
      phase: "setup",
      user_label: user.label,
    });

    if (loginResult.ok && loginResult.token) {
      validUsers.push(user);
    }
  }

  if (validUsers.length === 0) {
    throw new Error("Admin product load test requires at least one admin user with valid login credentials.");
  }

  // Fetch a category to use for product creation
  const categoriesResponse = http.get(`${baseUrl}/api/v1/category/get-category`, {
    tags: { flow: "admin-product", action: "get_categories", phase: "setup" },
  });
  const categoriesResult = trackResponse(categoriesResponse, {
    name: "admin_product_get_categories",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "admin-product", action: "get_categories", phase: "setup" },
  });

  const categories = categoriesResult.body?.categories || [];
  if (categories.length === 0) {
    throw new Error("Admin product load test requires at least one category.");
  }

  return {
    users: validUsers,
    categories,
  };
}

function buildProductFormData(iteration, categoryId) {
  return {
    name: `Load Product ${Date.now()}-${exec.vu.idInTest}-${iteration}`,
    description: `Load test product created at iteration ${iteration}`,
    price: String(((iteration % 50) + 1) * 10),
    quantity: String((iteration % 20) + 1),
    category: categoryId,
    shipping: String(iteration % 2 === 0),
  };
}

function createProduct(token, formData) {
  const response = http.post(
    `${baseUrl}/api/v1/product/create-product`,
    formData,
    {
      headers: { Authorization: `Bearer ${token}` },
      tags: { flow: "admin-product", action: "create_product" },
    }
  );

  return trackResponse(response, {
    name: "admin_product_create",
    expectedStatuses: [201],
    requireSuccess: true,
    tags: { flow: "admin-product", action: "create_product" },
  });
}

function getProduct(slug) {
  const response = http.get(`${baseUrl}/api/v1/product/get-product/${slug}`, {
    tags: { flow: "admin-product", action: "get_product" },
  });

  return trackResponse(response, {
    name: "admin_product_read",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "admin-product", action: "get_product" },
  });
}

function updateProduct(token, productId, formData) {
  const response = http.put(
    `${baseUrl}/api/v1/product/update-product/${productId}`,
    formData,
    {
      headers: { Authorization: `Bearer ${token}` },
      tags: { flow: "admin-product", action: "update_product" },
    }
  );

  return trackResponse(response, {
    name: "admin_product_update",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "admin-product", action: "update_product" },
  });
}

function deleteProduct(token, productId) {
  const response = http.del(
    `${baseUrl}/api/v1/product/delete-product/${productId}`,
    null,
    {
      headers: buildAuthHeaders(token),
      tags: { flow: "admin-product", action: "delete_product" },
    }
  );

  return trackResponse(response, {
    name: "admin_product_delete",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "admin-product", action: "delete_product" },
  });
}

export default function (data) {
  const user = pickUserForVu(data.users);
  const iteration = exec.scenario.iterationInTest;
  const category = data.categories[iteration % data.categories.length];

  // Login (cached per VU)
  if (!cachedSession || cachedSession.label !== user.label) {
    const loginResult = loginUser(user.email, user.password, {
      phase: "vu_session",
      user_label: user.label,
    });

    if (!loginResult.ok || !loginResult.token) {
      recordTransaction(false, {
        flow: "admin-product",
        user_label: user.label,
      });
      return;
    }

    cachedSession = {
      label: user.label,
      token: loginResult.token,
    };
  }

  // Create
  const formData = buildProductFormData(iteration, category._id);
  const createResult = createProduct(cachedSession.token, formData);

  if (!createResult.ok) {
    recordTransaction(false, {
      flow: "admin-product",
      user_label: user.label,
      action: "crud_cycle",
    });
    return;
  }

  const product = createResult.body?.products;
  const productId = product?._id;
  const productSlug = product?.slug;

  // Read
  const readResult = getProduct(productSlug);
  sleep(getNumberEnv("ADMIN_THINK_TIME_SECONDS", 0.5));

  // Update
  const updateFormData = {
    ...formData,
    name: `${formData.name} Updated`,
    price: String(Number(formData.price) + 5),
  };
  const updateResult = updateProduct(cachedSession.token, productId, updateFormData);
  sleep(getNumberEnv("ADMIN_THINK_TIME_SECONDS", 0.5));

  // Delete
  const deleteResult = deleteProduct(cachedSession.token, productId);

  const allPassed = createResult.ok && readResult.ok && updateResult.ok && deleteResult.ok;

  recordTransaction(allPassed, {
    flow: "admin-product",
    user_label: user.label,
    action: "crud_cycle",
  });

  sleep(getNumberEnv("THINK_TIME_SECONDS", 1));
}
