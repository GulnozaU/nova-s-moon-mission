import {
  PLAIN_DAY_POWER,
  PLAIN_LIT_DAYS,
  PLAIN_NIGHT_POWER,
  RIM_POWER_PER_DAY,
  SCIENCE_POINTS_PLAIN,
  SCIENCE_POINTS_RIM,
} from "../engine/constants";
import { isDaylight } from "../ui/teach/dayNight";
import type { SiteId } from "../types";

/** Kid-facing name for the build site. */
export function siteShortName(site: SiteId): string {
  return site === "rim" ? "South pole ridge" : "Mare plain";
}

/** Science points per walk at this site. */
export function siteSciencePerWalk(site: SiteId): number {
  return site === "rim" ? SCIENCE_POINTS_RIM : SCIENCE_POINTS_PLAIN;
}

/**
 * One-line “why this place matters today” for HUD / Nova.
 * Keeps the rim vs plain trade-off visible after the pick screen.
 */
export function siteTodayLine(site: SiteId, day: number, powerToday: number): string {
  const sci = siteSciencePerWalk(site);
  if (site === "rim") {
    return `Ridge · sunny · ${powerToday} chips · walks +${sci} sci`;
  }
  if (!isDaylight(site, day)) {
    return `Plain · NIGHT · ${powerToday} chips (solar ${PLAIN_NIGHT_POWER}) · walks +${sci}`;
  }
  const nightsIn = PLAIN_LIT_DAYS - day + 1;
  if (nightsIn <= 2) {
    return `Plain · ${nightsIn} sunny day${nightsIn === 1 ? "" : "s"} left · then only ${PLAIN_NIGHT_POWER} chips · walks +${sci}`;
  }
  return `Plain · sunny today · ${powerToday} chips · walks +${sci} sci (better than ridge)`;
}

/** Short Nova line right after picking a site. */
export function sitePickNovaLine(site: SiteId): string {
  if (site === "rim") {
    return `Ridge base: ~${RIM_POWER_PER_DAY} chips most days, but each science walk only +${SCIENCE_POINTS_RIM}.`;
  }
  return `Plain base: walks +${SCIENCE_POINTS_PLAIN} science, but after day ${PLAIN_LIT_DAYS} you only get ~${PLAIN_NIGHT_POWER} solar chips.`;
}

/** Day-1 morning story that names the trade-off. */
export function siteDay1Story(site: SiteId): string {
  if (site === "rim") {
    return `We built on the sunny ridge — steadier chips (~${RIM_POWER_PER_DAY}/day), but walks give only +${SCIENCE_POINTS_RIM} science.`;
  }
  return `We built on the plain — walks give +${SCIENCE_POINTS_PLAIN} science, but days ${PLAIN_LIT_DAYS + 1}–10 go dark (~${PLAIN_NIGHT_POWER} solar chips).`;
}

/** Concrete trade lines for the site pick cards. */
export function sitePickTrade(site: SiteId): { helps: string; costs: string } {
  if (site === "rim") {
    return {
      helps: `↑ Helps: ~${RIM_POWER_PER_DAY} chips every day`,
      costs: `↓ Costs: each walk only +${SCIENCE_POINTS_RIM} science`,
    };
  }
  return {
    helps: `↑ Helps: each walk +${SCIENCE_POINTS_PLAIN} science`,
    costs: `↓ Costs: after day ${PLAIN_LIT_DAYS}, only ~${PLAIN_NIGHT_POWER} solar chips (was ${PLAIN_DAY_POWER})`,
  };
}
