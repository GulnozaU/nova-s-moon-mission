import {
  PLAIN_DAY_POWER,
  PLAIN_LIT_DAYS,
  PLAIN_NIGHT_POWER,
  RIM_POWER_PER_DAY,
} from "./constants";
import type { SiteId } from "../types";

/** Base solar generation for this site and mission day (before panel bonus). */
export function baseGeneration(site: SiteId, day: number): number {
  if (site === "rim") {
    return RIM_POWER_PER_DAY;
  }
  // Plain: first PLAIN_LIT_DAYS are sunlit, then night block.
  return day <= PLAIN_LIT_DAYS ? PLAIN_DAY_POWER : PLAIN_NIGHT_POWER;
}

/**
 * Total chips available at day start: generation + panelBonus + battery.
 * `panelBonus` is already extra chips/day (SPEC GameState).
 */
export function availablePower(
  site: SiteId,
  day: number,
  panelBonus: number,
  battery: number,
): number {
  return baseGeneration(site, day) + panelBonus + battery;
}
