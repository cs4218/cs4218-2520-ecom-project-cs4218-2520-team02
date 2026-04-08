// Yap Zhao Yi, A0277540B
import { sleep } from "k6";
import { createSpikeOptions } from "./configs/thresholds.js";
import { loginUser, getSpikeUserPool, pickUserForVu } from "./helpers/auth.js";
import { getNumberEnv } from "../common/k6/env.js";
import { recordTransaction } from "../common/k6/metrics.js";

let cachedSession = null;
export const options = createSpikeOptions({ flow: "auth.login" });

export function setup() {
  const users = getSpikeUserPool();

  if (!users || users.length === 0) {
    throw new Error("Login spike test requires at least one valid user.");
  }

  return { users };
}

export default function (data) {
  const user = pickUserForVu(data.users);

  // Only login once per VU
  if (!cachedSession || cachedSession.label !== user.label) {
    const loginResult = loginUser(user.email, user.password, {
      auth_scenario: "login",
      user_label: user.label,
    });

    if (!loginResult.ok) {
      recordTransaction(false, {
        flow: "auth.login",
        user_label: user.label,
      });
      return;
    }

    cachedSession = {
      label: user.label,
      token: loginResult.token,
    };
  }

  recordTransaction(true, {
    flow: "auth.login",
    user_label: user.label,
  });

  sleep(getNumberEnv("THINK_TIME_SECONDS", 1));
}
