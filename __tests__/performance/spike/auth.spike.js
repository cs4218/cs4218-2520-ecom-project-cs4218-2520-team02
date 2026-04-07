// Yap Zhao Yi, A0277540B
import { sleep } from "k6";
import { createSpikeOptions } from "./configs/thresholds.js";
import { buildUniqueUser, loginUser, registerUser } from "./helpers/auth.js";
import { getNumberEnv } from "./helpers/env.js";
import { recordTransaction } from "./helpers/metrics.js";

export const options = createSpikeOptions({ flow: "auth" })

export default function(data) {
    // Registration
    const user = buildUniqueUser();
    const registerResult = registerUser(user, { auth_scenario: "registration" });
    recordTransaction(registerResult.ok, { flow: "auth", auth_scenario: "registration" });

    sleep(getNumberEnv("THINK_TIME_SECONDS", 1));

    // Login
    const loginResult = loginUser(user.email, user.password, { auth_scenario: "login"});
    recordTransaction(loginResult.ok, { flow: "auth", auth_scenario: "login"});

    sleep(getNumberEnv("THINK_TIME_SECONDS", 1));
}
