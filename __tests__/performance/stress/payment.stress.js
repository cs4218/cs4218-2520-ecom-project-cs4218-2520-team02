// Censon Lee Lemuel John Alejo, A0273436B
import http from "k6/http";
import { sleep } from "k6";
import { createStressOptions } from "./configs/thresholds.js";
import { buildAuthHeaders, getStressUserPool, loginUser, pickUserForVu } from "./helpers/auth.js";
import { getBaseUrl, getNumberEnv, getOptionalEnv } from "./helpers/env.js";
import { recordTransaction, trackResponse } from "./helpers/metrics.js";
import { buildCart } from "./helpers/payloads.js";

const baseUrl = getBaseUrl();
let cachedSession = null;

export const options = createStressOptions({ flow: "payment" });

export function setup() {
  const users = getStressUserPool();
  if (users.length === 0) {
    throw new Error("Payment stress test requires at least one valid user.");
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
    throw new Error("Payment stress test requires at least one user with valid login credentials.");
  }

  const productsResponse = http.get(`${baseUrl}/api/v1/product/product-list/1`, {
    tags: { flow: "payment", action: "get_products" },
  });
  const productsResult = trackResponse(productsResponse, {
    name: "payment_get_products",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "payment", action: "get_products" },
  });

  const products = productsResult.body?.products || [];
  if (products.length === 0) {
    throw new Error("The payment stress test needs at least one product in the catalogue.");
  }

  return {
    users: validUsers,
    products,
  };
}

export default function (data) {
  const user = pickUserForVu(data.users);

  if (!cachedSession || cachedSession.label !== user.label) {
    const loginResult = loginUser(user.email, user.password, {
      phase: "vu_session",
      user_label: user.label,
    });

    if (!loginResult.ok || !loginResult.token) {
      recordTransaction(false, {
        flow: "payment",
        user_label: user.label,
      });
      return;
    }

    cachedSession = {
      label: user.label,
      token: loginResult.token,
    };
  }

  const tokenResponse = http.get(`${baseUrl}/api/v1/product/braintree/token`, {
    tags: { flow: "payment", action: "get_braintree_token" },
  });
  const tokenResult = trackResponse(tokenResponse, {
    name: "payment_get_braintree_token",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "payment", action: "get_braintree_token" },
  });

  const cartSize = getNumberEnv("PAYMENT_CART_SIZE", 2);
  const cart = buildCart(data.products, cartSize);
  const paymentNonce = getOptionalEnv("PAYMENT_NONCE", "fake-valid-nonce");

  const paymentResponse = http.post(
    `${baseUrl}/api/v1/product/braintree/payment`,
    JSON.stringify({
      nonce: paymentNonce,
      cart,
    }),
    {
      headers: buildAuthHeaders(cachedSession.token),
      tags: { flow: "payment", action: "submit_payment" },
    }
  );

  const paymentResult = trackResponse(paymentResponse, {
    name: "payment_submit",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "payment", action: "submit_payment" },
  });

  recordTransaction(tokenResult.ok && paymentResult.ok, {
    flow: "payment",
    user_label: user.label,
  });

  sleep(getNumberEnv("THINK_TIME_SECONDS", 1));
}
