// Yap Zhao Yi, A0277540B
import exec from "k6/execution";
import http from "k6/http";
import { getBaseUrl, getJsonEnv, getOptionalEnv, getRequiredEnv, getStringListEnv } from "./env.js";
import { trackResponse } from "./metrics.js";

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

export function buildAuthHeaders(token) {
  return {
    ...JSON_HEADERS,
    Authorization: `Bearer ${token}`,
  };
}

export function getExistingUserCredentials() {
  return {
    email: getOptionalEnv("SPIKE_USER_EMAIL") || getRequiredEnv("TEST_USER_EMAIL"),
    password: getOptionalEnv("SPIKE_USER_PASSWORD") || getRequiredEnv("TEST_PASSWORD"),
  };
}

export function getSpikeUserPool() {
  const explicitPool = getJsonEnv("SPIKE_USER_POOL", null);
  if (Array.isArray(explicitPool) && explicitPool.length > 0) {
    return explicitPool.map((entry, index) => normalizeUserPoolEntry(entry, index));
  }

  const emails = getStringListEnv("SPIKE_USER_EMAILS", []);
  const sharedPassword =
    getOptionalEnv("SPIKE_USER_PASSWORD") || getOptionalEnv("TEST_PASSWORD");

  if (emails.length > 0 && sharedPassword) {
    return emails.map((email, index) =>
      normalizeUserPoolEntry(
        {
          email,
          password: sharedPassword,
        },
        index
      )
    );
  }

  return [normalizeUserPoolEntry(getExistingUserCredentials(), 0)];
}

function normalizeUserPoolEntry(entry, index) {
  if (!entry || typeof entry !== "object") {
    throw new Error("Each SPIKE_USER_POOL entry must be an object with email and password.");
  }

  const email = typeof entry.email === "string" ? entry.email.trim() : "";
  const password = typeof entry.password === "string" ? entry.password.trim() : "";

  if (!email || !password) {
    throw new Error(
      `Invalid SPIKE_USER_POOL entry at index ${index}. Both email and password are required.`
    );
  }

  return {
    email,
    password,
    label: typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : `user-${index + 1}`,
  };
}

export function pickUserForVu(users) {
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error("At least one spike-test user is required.");
  }

  return users[(exec.vu.idInTest - 1) % users.length];
}

export function buildUniqueUser() {
  const runId = getOptionalEnv("SPIKE_TEST_RUN_ID", "adhoc");
  const suffix = `${Date.now()}-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`;

  return {
    name: `Spike User ${runId} ${suffix}`,
    email: `spike-${runId}-${suffix}@example.com`,
    password: "Spike1234!",
    phone: "91234567",
    address: "123 Spike Street",
    answer: "Soccer",
  };
}

export function registerUser(user, extraTags = {}) {
  const response = http.post(
    `${getBaseUrl()}/api/v1/auth/register`,
    JSON.stringify(user),
    {
      headers: JSON_HEADERS,
      tags: { flow: "auth", action: "register", ...extraTags },
    }
  );

  return {
    response,
    ...trackResponse(response, {
      name: "auth_register",
      expectedStatuses: [201],
      requireSuccess: true,
      tags: { flow: "auth", action: "register", ...extraTags },
    }),
  };
}

export function loginUser(email, password, extraTags = {}) {
  const response = http.post(
    `${getBaseUrl()}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: JSON_HEADERS,
      tags: { flow: "auth", action: "login", ...extraTags },
    }
  );

  const result = trackResponse(response, {
    name: "auth_login",
    expectedStatuses: [200],
    requireSuccess: true,
    tags: { flow: "auth", action: "login", ...extraTags },
  });

  return {
    response,
    token: result.body?.token,
    user: result.body?.user,
    ...result,
  };
}
