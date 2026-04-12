// Yap Zhao Yi, A0277540B
import { getNumberEnv, getOptionalEnv } from "../../common/k6/env.js";

export function createSpikeStages() {
  const baselineVUs = getNumberEnv("SPIKE_BASELINE_VUS", 50);
  const spikeVUs = getNumberEnv("SPIKE_PEAK_VUS", 150);

  return [

    // Ramp to baseline
    {
      duration: getOptionalEnv("SPIKE_RAMP_UP_DURATION", "30s"),
      target: baselineVUs,
    },

    // Maintain baseline
    {
      duration: getOptionalEnv("SPIKE_BASELINE_DURATION", "1m"), // For baseline testing 30. Real testing 1m.
      target: baselineVUs,
    },

    // Spike up
    {
      duration: getOptionalEnv("SPIKE_RAMP_SPIKE_DURATION", "1s"),
      target: spikeVUs,
    },

    // Hold spike
    {
      duration: getOptionalEnv("SPIKE_HOLD_DURATION", "1m"),
      target: spikeVUs,
    },

    // Spike down
    {
      duration: getOptionalEnv("SPIKE_RAMP_DOWN_DURATION", "1s"),
      target: baselineVUs,
    },
    
    // Recovery
    {
      duration: getOptionalEnv("SPIKE_RECOVERY_DURATION", "30s"),
      target: baselineVUs,
    },

    // Use built in K6 Grafana ramp down
  ];
}
