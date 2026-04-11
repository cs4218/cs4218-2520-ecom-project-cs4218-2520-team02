// Jovin Ang Yusheng, A0273460H
import { sleep } from "k6";
import { createLoadOptions } from "./configs/thresholds.js";
import { buildUniqueUser, registerUser } from "./helpers/auth.js";
import { getNumberEnv } from "../common/k6/env.js";
import { recordTransaction } from "../common/k6/metrics.js";

export const options = createLoadOptions({ flow: "auth.register" });

export default function () {
  const user = buildUniqueUser();
  const registerResult = registerUser(user, { auth_scenario: "registration" });

  recordTransaction(registerResult.ok, {
    flow: "auth.register",
    auth_scenario: "registration",
  });

  if (!registerResult.ok) {
    return;
  }

  sleep(getNumberEnv("THINK_TIME_SECONDS", 1));
}
