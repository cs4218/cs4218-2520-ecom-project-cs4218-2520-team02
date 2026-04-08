import { getNumberEnv, getOptionalEnv } from "../../common/k6/env.js";

export function createStressStages() {
  return [
    {
      duration: getOptionalEnv("STRESS_WARMUP_DURATION", "20s"),
      target: getNumberEnv("STRESS_WARMUP_VUS", 20),
    },
    {
      duration: getOptionalEnv("STRESS_RAMP_1_DURATION", "30s"),
      target: getNumberEnv("STRESS_RAMP_1_VUS", 100),
    },
    {
      duration: getOptionalEnv("STRESS_RAMP_2_DURATION", "30s"),
      target: getNumberEnv("STRESS_RAMP_2_VUS", 250),
    },
    {
      duration: getOptionalEnv("STRESS_RAMP_3_DURATION", "30s"),
      target: getNumberEnv("STRESS_RAMP_3_VUS", 500),
    },
    {
      duration: getOptionalEnv("STRESS_RAMP_4_DURATION", "30s"),
      target: getNumberEnv("STRESS_RAMP_4_VUS", 750),
    },
    {
      duration: getOptionalEnv("STRESS_PEAK_DURATION", "30s"),
      target: getNumberEnv("STRESS_PEAK_VUS", 1000),
    },
    {
      duration: getOptionalEnv("STRESS_COOLDOWN_DURATION", "20s"),
      target: 0,
    },
  ];
}
