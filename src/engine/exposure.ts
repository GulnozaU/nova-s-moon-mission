import {
  NORMAL_OUTSIDE_EXPOSURE,
  SHELTER_EXPOSURE_FACTOR,
  SHIELD_REDUCTION_PER_LEVEL,
  STORM_EXPOSURE_PER_SEVERITY,
} from "./constants";

/**
 * Storm exposure delta from SPEC 3.7:
 * base = severity * 15
 * sheltered: base * 0.15 * (1 - 0.2 * shieldLevel)
 * else:      base * (1 - 0.2 * shieldLevel)
 */
export function stormExposureDelta(
  severity: 1 | 2 | 3,
  shieldLevel: number,
  sheltered: boolean,
): number {
  const base = severity * STORM_EXPOSURE_PER_SEVERITY;
  const shieldFactor = 1 - SHIELD_REDUCTION_PER_LEVEL * shieldLevel;
  if (sheltered) {
    return base * SHELTER_EXPOSURE_FACTOR * shieldFactor;
  }
  return base * shieldFactor;
}

/** Non-storm outdoor exposure when the crew works outside. */
export function normalOutsideExposure(): number {
  return NORMAL_OUTSIDE_EXPOSURE;
}
