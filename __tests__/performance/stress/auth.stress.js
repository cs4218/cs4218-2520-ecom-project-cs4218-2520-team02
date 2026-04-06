import { sleep } from "k6";
import { createStressStages } from "./configs/stages.js";
import { createStressOptions } from "./configs/thresholds.js";
import { buildUniqueUser, getStressUserPool, loginUser, pickUserForVu, registerUser } from "./helpers/auth.js";
import { getNumberEnv } from "./helpers/env.js";
import { recordTransaction } from "./helpers/metrics.js";

export const options = createStressOptions(
  { flow: "auth" },
  {
    scenarios: {
      registration_stress: {
        executor: "ramping-vus",
        exec: "registerScenario",
        stages: createStressStages(),
        tags: { auth_scenario: "registration" },
      },
      login_stress: {
        executor: "ramping-vus",
        exec: "loginScenario",
        stages: createStressStages(),
        startTime: getNumberEnv("AUTH_LOGIN_START_DELAY_SECONDS", 10) + "s",
        tags: { auth_scenario: "login" },
      },
    },
  }
);

export function setup() {
  return {
    loginUsers: getStressUserPool(),
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
