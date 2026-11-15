import type { SiteId } from "../../types";
import { PLAIN_LIT_DAYS } from "../../engine/constants";

/** Plain site: first half lit; rim: nearly always day (game ASSUMPTION). */
export function isDaylight(site: SiteId, day: number): boolean {
  if (site === "rim") return true;
  return day <= PLAIN_LIT_DAYS;
}

export function sunBarLabel(site: SiteId): string {
  return site === "rim"
    ? "Sunny almost every day"
    : "Dark for half the time";
}
