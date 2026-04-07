// Yap Zhao Yi, A0277540B
import http from "k6/http";
import { sleep } from "k6";
import { createSpikeOptions } from "./configs/thresholds.js";
import { buildAuthHeaders, getSpikeUserPool, loginUser, pickUserForVu } from "./helpers/auth.js";
import { getBaseUrl, getNumberEnv } from "./helpers/env.js";
import { recordTransaction, trackResponse } from "./helpers/metrics.js";

const baseUrl = getBaseUrl();
export const options = createSpikeOptions({ flow: "orders" });

export function setup() {
  const users = getSpikeUserPool();
  if (users.length === 0) {
    throw new Error("Orders spike test requires at least one user.");
  }

  const loggedInUsersWithOrders = users
    .map(user => {
      const loginResult = loginUser(user.email, user.password, {
        phase: "setup",
        user_label: user.label,
      });

      if (!loginResult.ok || !loginResult.token) return null;

      // Fetch orders during setup
      const ordersResponse = http.get(`${baseUrl}/api/v1/auth/orders`, {
        headers: buildAuthHeaders(loginResult.token),
        tags: { flow: "orders", action: "setup_validate_orders" },
      });

      const ordersResult = trackResponse(ordersResponse, {
        name: "orders_validate_history",
        expectedStatuses: [200],
        requireSuccess: true,
        tags: { flow: "orders", action: "setup_validate_orders" },
      });

      const hasOrders =
        Array.isArray(ordersResult.body?.orders) && ordersResult.body.orders.length > 0;

      return hasOrders ? { ...user, token: loginResult.token } : null;
    })
    .filter(Boolean);

  if (loggedInUsersWithOrders.length === 0) {
    throw new Error(
      "Order tracking spike test requires at least one valid user with existing orders."
    );
  }

  return { users: loggedInUsersWithOrders };
}

export default function (data) {
  const user = pickUserForVu(data.users);

  if (!user?.token) {
    recordTransaction(false, { flow: "orders", user_label: user?.label || "unknown" });
    return;
  }

  const response = http.get(`${baseUrl}/api/v1/auth/orders`, {
    headers: buildAuthHeaders(user.token),
    tags: { flow: "orders", action: "get_orders" },
  });

  const result = trackResponse(response, {
    name: "orders_get_history",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "orders", action: "get_orders" },
  });

  const hasOrders = Array.isArray(result.body?.orders) && result.body.orders.length > 0;

  recordTransaction(result.ok && hasOrders, {
    flow: "orders",
    user_label: user.label,
  });

  sleep(getNumberEnv("THINK_TIME_SECONDS", 1));
}