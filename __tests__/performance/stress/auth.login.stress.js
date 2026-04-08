// Censon Lee Lemuel John Alejo, A0273436B
import { sleep } from "k6";
import { createStressOptions } from "./configs/thresholds.js";
import { getStressUserPool, loginUser, pickUserForVu } from "./helpers/auth.js";
import { getNumberEnv } from "./helpers/env.js";
import { recordTransaction } from "./helpers/metrics.js";

let cachedSession = null;
export const options = createStressOptions({ flow: "auth.login" });

export function setup() {
  const users = getStressUserPool();

  if (!users || users.length === 0) {
    throw new Error("Login stress test requires at least one valid user.");
  }

  return { users };
}

export default function (data) {
  const user = pickUserForVu(data.users);

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
