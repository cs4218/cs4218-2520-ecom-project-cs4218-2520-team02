import exec from "k6/execution";
import http from "k6/http";
import {
  getBaseUrl,
  getJsonEnv,
  getOptionalEnv,
  getRequiredEnv,
  getStringListEnv,
} from "./env.js";
import { trackResponse } from "./metrics.js";

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function normalizeUserPoolEntry(entry, index, poolName) {
  if (!entry || typeof entry !== "object") {
    throw new Error(`Each ${poolName} entry must be an object with email and password.`);
  }

  const email = typeof entry.email === "string" ? entry.email.trim() : "";
  const password = typeof entry.password === "string" ? entry.password.trim() : "";

  if (!email || !password) {
    throw new Error(
      `Invalid ${poolName} entry at index ${index}. Both email and password are required.`
    );
  }

  return {
    email,
    password,
    label:
      typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : `user-${index + 1}`,
  };
}

export function createSuiteAuthHelpers({
  suitePrefix,
  suiteLabel,
  password,
  address,
  userEmailPrefix,
}) {
  const poolEnv = `${suitePrefix}_USER_POOL`;
  const emailEnv = `${suitePrefix}_USER_EMAIL`;
  const emailsEnv = `${suitePrefix}_USER_EMAILS`;
  const passwordEnv = `${suitePrefix}_USER_PASSWORD`;
  const testRunEnv = `${suitePrefix}_TEST_RUN_ID`;

  function buildAuthHeaders(token) {
    return {
      ...JSON_HEADERS,
      Authorization: `Bearer ${token}`,
    };
  }

  function getExistingUserCredentials() {
    return {
      email: getOptionalEnv(emailEnv) || getRequiredEnv("TEST_USER_EMAIL"),
      password: getOptionalEnv(passwordEnv) || getRequiredEnv("TEST_PASSWORD"),
    };
  }

  function getUserPool() {
    const explicitPool = getJsonEnv(poolEnv, null);
    if (Array.isArray(explicitPool) && explicitPool.length > 0) {
      return explicitPool.map((entry, index) => normalizeUserPoolEntry(entry, index, poolEnv));
    }

    const emails = getStringListEnv(emailsEnv, []);
    const sharedPassword = getOptionalEnv(passwordEnv) || getOptionalEnv("TEST_PASSWORD");

    if (emails.length > 0 && sharedPassword) {
      return emails.map((email, index) =>
        normalizeUserPoolEntry(
          {
            email,
            password: sharedPassword,
          },
          index,
          poolEnv
        )
      );
    }

    return [normalizeUserPoolEntry(getExistingUserCredentials(), 0, poolEnv)];
  }

  function pickUserForVu(users) {
    if (!Array.isArray(users) || users.length === 0) {
      throw new Error(`At least one ${suiteLabel}-test user is required.`);
    }

    return users[(exec.vu.idInTest - 1) % users.length];
  }

  function buildUniqueUser() {
    const runId = getOptionalEnv(testRunEnv, "adhoc");
    const suffix = `${Date.now()}-${exec.vu.idInTest}-${exec.scenario.iterationInTest}`;

    return {
      name: `${suiteLabel} User ${runId} ${suffix}`,
      email: `${userEmailPrefix}-${runId}-${suffix}@example.com`,
      password,
      phone: "91234567",
      address,
      answer: "Soccer",
    };
  }

  function registerUser(user, extraTags = {}) {
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

  function loginUser(email, userPassword, extraTags = {}) {
    const response = http.post(
      `${getBaseUrl()}/api/v1/auth/login`,
      JSON.stringify({ email, password: userPassword }),
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

  return {
    buildAuthHeaders,
    buildUniqueUser,
    getExistingUserCredentials,
    getUserPool,
    loginUser,
    pickUserForVu,
    registerUser,
  };
}
