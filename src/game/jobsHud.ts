import type { DayDecisions } from "../engine/types";
import { plannedPowerCost } from "../ui/powerMath";
import {
  COMMS_COST,
  GREENHOUSE_COST,
  HEAT_COST,
  OXYGEN_MAKER_COST,
  RECYCLER_COST,
  SCIENCE_COST_PER_LEVEL,
} from "../engine/constants";

export type JobRow = {
  id: string;
  label: string;
  on: boolean;
  where: string;
};

export function jobRows(d: DayDecisions): JobRow[] {
  return [
    { id: "heat", label: `Heat (always ${HEAT_COST})`, on: true, where: "auto" },
    {
      id: "recycler",
      label: `Water cleaner (${RECYCLER_COST})`,
      on: d.recycler,
      where: "Crew home",
    },
    {
      id: "air",
      label: `Air maker (${OXYGEN_MAKER_COST})`,
      on: d.oxygenMaker,
      where: "Crew home",
    },
    {
      id: "comms",
      label: `Talk to Earth (${COMMS_COST})`,
      on: d.comms,
      where: "Crew home",
    },
    {
      id: "gh",
      label: `Water plants (${GREENHOUSE_COST}+2💧)`,
      on: Boolean(d.greenhouse),
      where: "Greenhouse",
    },
    {
      id: "sci",
      label: `Science walks ×${d.scienceLevel} (${SCIENCE_COST_PER_LEVEL} each)`,
      on: d.scienceLevel > 0,
      where: "Science lab",
    },
  ];
}

export function jobsSummaryLine(d: DayDecisions, powerToday: number): string {
  const spent = plannedPowerCost(d);
  const done = jobRows(d).filter((j) => j.on).length;
  return `TODAY'S JOBS ${done}/6 · power ${spent}/${powerToday}`;
}
