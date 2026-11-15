/**
 * CME travel-time warning from SPEC 4.1.
 * hours = 149_600_000 km / speedKmS / 3600  (≈ 1 AU Sun→Earth/Moon distance)
 * warningDays = floor(hours / 24), minimum 0
 * Without comms, halve warning days.
 *
 * Distance constant is REFERENCE-scale physics (~1 AU); game rounding rules are ASSUMPTION.
 */

/** Approximate Sun–Earth/Moon distance in km (~1 AU). REFERENCE (astronomy). */
export const AU_KM = 149_600_000; // REFERENCE

export type WarningResult = {
  hours: number;
  warningDays: number;
  speedKmS: number;
  commsOn: boolean;
  distanceKm: number;
  distanceBadge: "REFERENCE";
};

/**
 * @param speedKmS CME speed from DONKI analysis (km/s). Must be > 0.
 * @param commsOn If false, warning days are halved (floor after halving).
 */
export function warningFromCmeSpeed(
  speedKmS: number,
  commsOn: boolean,
): WarningResult {
  if (!Number.isFinite(speedKmS) || speedKmS <= 0) {
    return {
      hours: 0,
      warningDays: 0,
      speedKmS,
      commsOn,
      distanceKm: AU_KM,
      distanceBadge: "REFERENCE",
    };
  }

  const hours = AU_KM / speedKmS / 3600;
  let warningDays = Math.floor(hours / 24);
  if (warningDays < 0) warningDays = 0;
  if (!commsOn) {
    warningDays = Math.floor(warningDays / 2);
  }

  return {
    hours,
    warningDays,
    speedKmS,
    commsOn,
    distanceKm: AU_KM,
    distanceBadge: "REFERENCE",
  };
}
