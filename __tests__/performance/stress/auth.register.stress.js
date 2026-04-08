// Censon Lee Lemuel John Alejo, A0273436B
import { sleep } from "k6";
import { createStressOptions } from "./configs/thresholds.js";
import { buildUniqueUser, registerUser } from "./helpers/auth.js";
import { getNumberEnv } from "../common/k6/env.js";
import { recordTransaction } from "../common/k6/metrics.js";

export const options = createStressOptions({ flow: "auth.register" });

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
