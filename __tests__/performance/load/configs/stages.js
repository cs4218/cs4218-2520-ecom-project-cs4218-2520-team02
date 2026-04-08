import { getNumberEnv, getOptionalEnv } from "../../common/k6/env.js";

export function createLoadStages() {
  return [
    {
      duration: getOptionalEnv("LOAD_RAMP_UP_DURATION", "30s"),
      target: getNumberEnv("LOAD_RAMP_UP_VUS", 25),
    },
    {
      duration: getOptionalEnv("LOAD_STEADY_DURATION", "3m"),
      target: getNumberEnv("LOAD_STEADY_VUS", 50),
    },
    {
      duration: getOptionalEnv("LOAD_PEAK_DURATION", "1m"),
      target: getNumberEnv("LOAD_PEAK_VUS", 75),
    },
    {
      duration: getOptionalEnv("LOAD_SUSTAINED_PEAK_DURATION", "2m"),
      target: getNumberEnv("LOAD_SUSTAINED_PEAK_VUS", 75),
    },
    {
      duration: getOptionalEnv("LOAD_COOLDOWN_DURATION", "30s"),
      target: 0,
    },
  ];
}
