// Gavin Sin Fu Chen, A0273285X
import http from "k6/http";
import { sleep } from "k6";
import { buildAuthHeaders, getCapacityUserPool, loginUser, pickUserForVu } from "./helpers/auth.js";
import { getNumberEnv, getOptionalEnv, getBaseUrl } from "../common/k6/env.js";
import { buildCart } from "../common/k6/payloads.js";
import {
  markFailedCapacityJourney,
  markResponseBreaches,
  recordCapacityTransaction,
  trackCapacityResponse,
} from "./helpers/breachMarkers.js";
import { createCapacityOptions } from "./configs/thresholds.js";

const baseUrl = getBaseUrl();
let cachedSession = null;

export const options = createCapacityOptions({ flow: "payment" });

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
  const users = getCapacityUserPool();
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
    markFailedCapacityJourney("submit_payment", {
      flow: "payment",
      action: "submit_payment",
      user_label: user?.label,
    });
  }

  recordCapacityTransaction(success, {
    flow: "payment",
    journey: "submit_payment",
    user_label: user.label,
  });

  sleep(getNumberEnv("CAPACITY_THINK_TIME_SECONDS", 0.5));
}
