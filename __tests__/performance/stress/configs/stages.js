// Censon Lee Lemuel John Alejo, A0273436B
import { getNumberEnv, getOptionalEnv } from "../../common/k6/env.js";

export function createStressStages() {
  const warmupVUs = getNumberEnv("STRESS_WARMUP_VUS", 50);
  const ramp1VUs = getNumberEnv("STRESS_RAMP_1_VUS", 100);
  const ramp2VUs = getNumberEnv("STRESS_RAMP_2_VUS", 250);
  const ramp3VUs = getNumberEnv("STRESS_RAMP_3_VUS", 500);
  const ramp4VUs = getNumberEnv("STRESS_RAMP_4_VUS", 750);
  const peakVUs = getNumberEnv("STRESS_PEAK_VUS", 1000);

  return [
    // Ramp into the initial warmup load.
    {
      duration: getOptionalEnv("STRESS_WARMUP_DURATION", "30s"),
      target: warmupVUs,
    },
    // Hold the warmup load briefly before the first step up.
    {
      duration: getOptionalEnv("STRESS_WARMUP_HOLD_DURATION", "30s"),
      target: warmupVUs,
    },
    // Step 1: ramp, then hold.
    {
      duration: getOptionalEnv("STRESS_RAMP_1_DURATION", "30s"),
      target: ramp1VUs,
    },
    {
      duration: getOptionalEnv("STRESS_HOLD_1_DURATION", "30s"),
      target: ramp1VUs,
    },
    // Step 2: ramp, then hold.
    {
      duration: getOptionalEnv("STRESS_RAMP_2_DURATION", "30s"),
      target: ramp2VUs,
    },
    {
      duration: getOptionalEnv("STRESS_HOLD_2_DURATION", "30s"),
      target: ramp2VUs,
    },
    // Step 3: ramp, then hold.
    {
      duration: getOptionalEnv("STRESS_RAMP_3_DURATION", "30s"),
      target: ramp3VUs,
    },
    {
      duration: getOptionalEnv("STRESS_HOLD_3_DURATION", "30s"),
      target: ramp3VUs,
    },
    // Step 4: ramp, then hold.
    {
      duration: getOptionalEnv("STRESS_RAMP_4_DURATION", "30s"),
      target: ramp4VUs,
    },
    {
      duration: getOptionalEnv("STRESS_HOLD_4_DURATION", "30s"),
      target: ramp4VUs,
    },
    // Final step to peak, then hold the peak load.
    {
      duration: getOptionalEnv("STRESS_PEAK_RAMP_DURATION", "30s"),
      target: peakVUs,
    },
    {
      duration: getOptionalEnv("STRESS_PEAK_DURATION", "30s"),
      target: peakVUs,
    },
    {
      duration: getOptionalEnv("STRESS_COOLDOWN_DURATION", "30s"),
      target: 0,
    },
  ];
}
