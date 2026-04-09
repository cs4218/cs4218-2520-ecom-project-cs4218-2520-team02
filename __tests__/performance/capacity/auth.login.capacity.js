import { sleep } from "k6";
import {
  getCapacityUserPool,
  loginUser,
  pickUserForVu,
} from "./helpers/auth.js";
import { getNumberEnv } from "../common/k6/env.js";
import {
  markFailedCapacityJourney,
  markResponseBreaches,
  recordCapacityTransaction,
} from "./helpers/breachMarkers.js";
import { createCapacityOptions } from "./configs/thresholds.js";

let cachedSession = null;

export const options = createCapacityOptions({ flow: "auth.login" });

export function setup() {
  const users = getCapacityUserPool();

  if (!users || users.length === 0) {
    throw new Error("Login capacity test requires at least one valid user.");
  }

  return { users };
}

export default function (data) {
  const user = pickUserForVu(data.users);
  let success = false;

  if (!cachedSession || cachedSession.label !== user.label) {
    const loginResult = loginUser(user.email, user.password, {
      auth_scenario: "login",
      user_label: user.label,
    });

    markResponseBreaches(loginResult.response, loginResult, {
      name: "capacity_auth_login",
      expectedStatuses: [200],
      requireSuccess: true,
      tags: {
        flow: "auth.login",
        action: "login",
        auth_scenario: "login",
        user_label: user.label,
      },
    });

    success = loginResult.ok;
    if (success) {
      cachedSession = {
        label: user.label,
        token: loginResult.token,
      };
    }
  } else {
    success = true;
  }

  if (!success) {
    markFailedCapacityJourney("login", {
      flow: "auth.login",
      action: "login",
      auth_scenario: "login",
      user_label: user?.label,
    });
  }

  recordCapacityTransaction(success, {
    flow: "auth.login",
    auth_scenario: "login",
    user_label: user.label,
  });

  sleep(getNumberEnv("CAPACITY_THINK_TIME_SECONDS", 0.5));
}
