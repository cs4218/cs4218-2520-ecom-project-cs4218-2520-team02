// Censon Lee Lemuel John Alejo, A0273436B
import { sleep } from "k6";
import { createStressOptions } from "./configs/thresholds.js";
import { getStressUserPool, loginUser, pickUserForVu } from "./helpers/auth.js";
import { getNumberEnv } from "../common/k6/env.js";
import { recordTransaction } from "../common/k6/metrics.js";

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

  // Always perform the login on every iteration — this is a login stress test,
  // so every iteration must exercise the login endpoint. Caching the session
  // would suppress all HTTP requests after the first iteration per VU, causing
  // the request rate to spike only during ramp phases and drop to zero on holds.
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

  recordTransaction(true, {
    flow: "auth.login",
    user_label: user.label,
  });

  sleep(getNumberEnv("THINK_TIME_SECONDS", 1));
}
