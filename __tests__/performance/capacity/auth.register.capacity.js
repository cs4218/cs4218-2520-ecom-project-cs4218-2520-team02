import { sleep } from "k6";
import { buildUniqueUser, registerUser } from "./helpers/auth.js";
import { getNumberEnv } from "../common/k6/env.js";
import {
  markFailedCapacityJourney,
  markResponseBreaches,
  recordCapacityTransaction,
} from "./helpers/breachMarkers.js";
import { createCapacityOptions } from "./configs/thresholds.js";

export const options = createCapacityOptions({ flow: "auth.register" });

export default function () {
  const user = buildUniqueUser();
  const registerResult = registerUser(user, {
    auth_scenario: "registration",
    performance_mode: "capacity",
  });

  markResponseBreaches(registerResult.response, registerResult, {
    name: "capacity_auth_register",
    expectedStatuses: [201],
    requireSuccess: true,
    tags: {
      flow: "auth.register",
      action: "register",
      auth_scenario: "registration",
    },
  });

  if (!registerResult.ok) {
    markFailedCapacityJourney("register", {
      flow: "auth.register",
      action: "register",
      auth_scenario: "registration",
    });
  }

  recordCapacityTransaction(registerResult.ok, {
    flow: "auth.register",
    auth_scenario: "registration",
  });

  if (!registerResult.ok) {
    return;
  }

  sleep(getNumberEnv("CAPACITY_THINK_TIME_SECONDS", 0.5));
}
