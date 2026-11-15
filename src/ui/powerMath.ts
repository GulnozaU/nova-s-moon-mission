import {
  CLEAN_FILTER_POWER_COST,
  COMMS_COST,
  GREENHOUSE_COST,
  HEAT_COST,
  OXYGEN_MAKER_COST,
  RECYCLER_COST,
  SCIENCE_COST_PER_LEVEL,
} from "../engine/constants";
import type { DayDecisions } from "../engine/types";

/** Power chips spent by current tap plan (heat is always included). */
export function plannedPowerCost(d: DayDecisions): number {
  let cost = HEAT_COST;
  if (d.cleanFilter) cost += CLEAN_FILTER_POWER_COST;
  if (d.recycler) cost += RECYCLER_COST;
  if (d.oxygenMaker) cost += OXYGEN_MAKER_COST;
  if (d.comms) cost += COMMS_COST;
  cost += Math.max(0, d.scienceLevel) * SCIENCE_COST_PER_LEVEL;
  if (d.greenhouse) cost += GREENHOUSE_COST;
  return cost;
}

export function defaultDecisions(): DayDecisions {
  // Start empty so kids walk rooms and turn jobs on (like a real adventure game).
  return {
    recycler: false,
    oxygenMaker: false,
    comms: false,
    scienceLevel: 0,
    greenhouse: false,
    buildShield: false,
    buildPanel: false,
    cleanFilter: false,
  };
}
