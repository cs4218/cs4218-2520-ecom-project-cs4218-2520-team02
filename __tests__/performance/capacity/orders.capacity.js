// Gavin Sin Fu Chen, A0273285X
import http from "k6/http";
import { sleep } from "k6";
import { buildAuthHeaders, getCapacityUserPool, loginUser, pickUserForVu } from "./helpers/auth.js";
import { getNumberEnv, getBaseUrl } from "../common/k6/env.js";
import {
  markFailedCapacityJourney,
  markResponseBreaches,
  recordCapacityTransaction,
  trackCapacityResponse,
} from "./helpers/breachMarkers.js";
import { createCapacityOptions } from "./configs/thresholds.js";

const baseUrl = getBaseUrl();
let cachedSession = null;

export const options = createCapacityOptions({ flow: "orders" });

function loginCapacityUser(user, phase) {
  const loginResult = loginUser(user.email, user.password, {
    phase,
    user_label: user.label,
  });

  markResponseBreaches(loginResult.response, loginResult, {
    name: "capacity_orders_login",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "orders", action: "login", phase, user_label: user.label },
  });

  return loginResult;
}

function getOrdersForUser(token, user, phase = "capacity") {
  const response = http.get(`${baseUrl}/api/v1/auth/orders`, {
    headers: buildAuthHeaders(token),
    tags: { flow: "orders", action: "get_orders", phase, user_label: user.label },
  });

  const result = trackCapacityResponse(response, {
    name: "capacity_orders_get_history",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "orders", action: "get_orders", phase, user_label: user.label },
  });

  return {
    ...result,
    hasOrders: Array.isArray(result.body?.orders) && result.body.orders.length > 0,
  };
}

export function setup() {
  const users = getCapacityUserPool();
  const validUsers = [];

  for (const user of users) {
    const loginResult = loginCapacityUser(user, "setup");
    if (!loginResult.ok || !loginResult.token) {
      continue;
    }

    const ordersResult = getOrdersForUser(loginResult.token, user, "setup");
    if (ordersResult.ok && ordersResult.hasOrders) {
      validUsers.push(user);
    }
  }

  if (validUsers.length === 0) {
    throw new Error("Orders capacity test requires at least one valid user with existing orders.");
  }

  return { users: validUsers };
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
    const ordersResult = getOrdersForUser(session.token, user);
    success = ordersResult.ok && ordersResult.hasOrders;
  }

  if (!success) {
    markFailedCapacityJourney("get_orders", {
      flow: "orders",
      action: "get_orders",
      user_label: user?.label,
    });
  }

  recordCapacityTransaction(success, {
    flow: "orders",
    journey: "get_orders",
    user_label: user.label,
  });

  sleep(getNumberEnv("CAPACITY_THINK_TIME_SECONDS", 0.5));
}
