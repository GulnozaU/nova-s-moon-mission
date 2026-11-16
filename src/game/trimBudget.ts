import { HEAT_COST, SCIENCE_SUCCESS_TARGET } from "../engine/constants";
import type { DayDecisions } from "../engine/types";
import { plannedPowerCost } from "../ui/powerMath";

/** Shut-off order when the plan costs more than today's power (heat stays on). */
const SHUT_ORDER: (keyof DayDecisions)[] = [
  "scienceLevel",
  "greenhouse",
  "comms",
  "oxygenMaker",
  "recycler",
  "cleanFilter",
  "buildPanel",
  "buildShield",
];

const NAMES: Partial<Record<keyof DayDecisions, string>> = {
  scienceLevel: "science walks",
  greenhouse: "plants",
  comms: "radio",
  oxygenMaker: "air maker",
  recycler: "water cleaner",
  cleanFilter: "filter clean",
  buildPanel: "solar panel",
  buildShield: "shield build",
};

export type TrimResult = {
  decisions: DayDecisions;
  turnedOff: string[];
};

/**
 * At day start: turn off machines that cannot be paid for.
 * Heat (forced) is always included in the budget.
 */
export function trimDecisionsToBudget(
  decisions: DayDecisions,
  powerToday: number,
): TrimResult {
  const next: DayDecisions = { ...decisions };
  const turnedOff: string[] = [];

  if (HEAT_COST > powerToday) {
    return { decisions: next, turnedOff };
  }

  while (plannedPowerCost(next) > powerToday) {
    let cut = false;
    for (const key of SHUT_ORDER) {
      if (key === "scienceLevel") {
        if (next.scienceLevel > 0) {
          next.scienceLevel = 0;
          turnedOff.push(NAMES.scienceLevel!);
          cut = true;
          break;
        }
        continue;
      }
      if (next[key]) {
        (next as Record<string, boolean | number | undefined>)[key] = false;
        turnedOff.push(NAMES[key] ?? String(key));
        cut = true;
        break;
      }
    }
    if (!cut) break;
  }

  return { decisions: next, turnedOff };
}

export function novaTrimSpeech(turnedOff: string[], day = 1): string {
  const goal =
    day === 1
      ? ` Success means last 10 days and Science goal: 0 / ${SCIENCE_SUCCESS_TARGET}.`
      : "";
  if (turnedOff.length === 0) {
    return (
      "Stand on a glowing circle to turn a machine on. Bed ends the day." + goal
    );
  }
  if (turnedOff.length === 1) {
    return `Not enough power for ${turnedOff[0]}. I turned it off.` + goal;
  }
  return `Not enough power. I turned off: ${turnedOff.join(", ")}.` + goal;
}
