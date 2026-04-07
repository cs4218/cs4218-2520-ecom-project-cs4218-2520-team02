// Yap Zhao Yi, A0277540B
import http from "k6/http";
import { sleep } from "k6";
import { createSpikeOptions } from "./configs/thresholds.js";
import { buildAuthHeaders, getSpikeUserPool, loginUser, pickUserForVu } from "./helpers/auth.js";
import { getBaseUrl, getNumberEnv } from "./helpers/env.js";
import { recordTransaction, trackResponse } from "./helpers/metrics.js";

const baseUrl = getBaseUrl();
let cachedSession = null;

export const options = createSpikeOptions({ flow: "orders" });

export function setup() {
  const users = getSpikeUserPool();
  const validUsers = [];

  for (const user of users) {
    const loginResult = loginUser(user.email, user.password, {
      phase: "setup",
    });

    if (!loginResult.ok || !loginResult.token) {
      continue;
    }

    const ordersResponse = http.get(`${baseUrl}/api/v1/auth/orders`, {
      headers: buildAuthHeaders(loginResult.token),
      tags: { flow: "orders", action: "validate_orders", phase: "setup" },
    });

    const ordersResult = trackResponse(ordersResponse, {
      name: "orders_validate_history",
      expectedStatuses: [200],
      requireSuccess: true,
      tags: { flow: "orders", action: "validate_orders", phase: "setup" },
    });

    if (Array.isArray(ordersResult.body?.orders) && ordersResult.body.orders.length > 0) {
      validUsers.push(user);
    }
  }

  if (validUsers.length === 0) {
    throw new Error("Order tracking spike test requires at least one valid user with existing orders.");
  }

  return { users: validUsers };
}

export default function (data) {
  const user = pickUserForVu(data.users);

  if (!cachedSession || cachedSession.label !== user.label) {
    const loginResult = loginUser(user.email, user.password, {
      phase: "vu_session",
    });

    if (!loginResult.ok || !loginResult.token) {
      recordTransaction(false, {
        flow: "orders",
        outcome: "login_failed",
      });
      return;
    }

    cachedSession = {
      label: user.label,
      token: loginResult.token,
    };
  }

  const response = http.get(`${baseUrl}/api/v1/auth/orders`, {
    headers: buildAuthHeaders(cachedSession.token),
    tags: { flow: "orders", action: "get_orders" },
  });

  const result = trackResponse(response, {
    name: "orders_get_history",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "orders", action: "get_orders" },
  });

  const hasOrders =
    Array.isArray(result.body?.orders) && result.body.orders.length > 0;

  recordTransaction(result.ok && hasOrders, {
    flow: "orders",
    outcome: hasOrders ? "has_orders" : "no_orders",
  });

  sleep(getNumberEnv("THINK_TIME_SECONDS", 1));
}