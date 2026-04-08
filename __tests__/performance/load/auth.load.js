// Jovin Ang Yusheng, A0273460H
import { sleep } from "k6";
import { createLoadStages } from "./configs/stages.js";
import { createLoadOptions } from "./configs/thresholds.js";
import { buildUniqueUser, getLoadUserPool, loginUser, pickUserForVu, registerUser } from "./helpers/auth.js";
import { getNumberEnv } from "../common/k6/env.js";
import { recordTransaction } from "../common/k6/metrics.js";

/*
 * Load Test — Registration & Login
 *
 * Verifies that the authentication system performs reliably under sustained
 * and realistic user traffic. Simulates steady concurrent users performing
 * registration and login requests.
 *
 * Performance criteria:
 *   - P95 response time remains consistent under sustained load
 *   - Error rate stays within acceptable thresholds (< 5%)
 */

export const options = createLoadOptions(
  { flow: "auth" },
  {
    scenarios: {
      registration_load: {
        executor: "ramping-vus",
        exec: "registerScenario",
        stages: createLoadStages(),
        tags: { auth_scenario: "registration" },
      },
      login_load: {
        executor: "ramping-vus",
        exec: "loginScenario",
        stages: createLoadStages(),
        startTime: getNumberEnv("AUTH_LOGIN_START_DELAY_SECONDS", 10) + "s",
        tags: { auth_scenario: "login" },
      },
    },
  }
);

export function setup() {
  return {
    loginUsers: getLoadUserPool(),
  };
}

export function registerScenario() {
  const user = buildUniqueUser();
  const registerResult = registerUser(user, { auth_scenario: "registration" });

  recordTransaction(registerResult.ok, {
    flow: "auth",
    auth_scenario: "registration",
  });

  sleep(getNumberEnv("THINK_TIME_SECONDS", 1));
}

export function loginScenario(data) {
  const user = pickUserForVu(data.loginUsers);
  const loginResult = loginUser(user.email, user.password, {
    auth_scenario: "login",
    user_label: user.label,
  });

  recordTransaction(loginResult.ok, {
    flow: "auth",
    auth_scenario: "login",
    user_label: user.label,
  });

  sleep(getNumberEnv("THINK_TIME_SECONDS", 1));
}
