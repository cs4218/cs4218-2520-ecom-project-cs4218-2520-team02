// Yap Zhao Yi, A0277540B
import { sleep } from "k6";
import { createSpikeOptions } from "./configs/thresholds.js";
import { loginUser, getSpikeUserPool, pickUserForVu } from "./helpers/auth.js";
import { getNumberEnv } from "../common/k6/env.js";
import { recordTransaction } from "../common/k6/metrics.js";

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

  // Always perform the login on every iteration — this is a login spike test,
  // so every iteration must exercise the login endpoint. Caching the session
  // would suppress HTTP requests after the first iteration per VU, causing the
  // request rate to spike only when new VUs are created rather than continuously
  // throughout the test.
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
