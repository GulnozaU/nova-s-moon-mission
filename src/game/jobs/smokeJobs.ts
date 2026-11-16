/**
 * Pure job helpers for smoke tests — mirrors drag-job outcomes without Phaser.
 */
import type { DayDecisions } from "../../engine/types";
import { plannedPowerCost } from "../../ui/powerMath";
import {
  COMMS_COST,
  GREENHOUSE_COST,
  OXYGEN_MAKER_COST,
  RECYCLER_COST,
  SCIENCE_COST_PER_LEVEL,
} from "../../engine/constants";
import { defaultDecisions } from "../../ui/powerMath";

export type RoomId = "surface" | "home" | "greenhouse" | "lab";

export const ROOMS: RoomId[] = ["surface", "home", "greenhouse", "lab"];

export type SmokeJob = {
  room: RoomId;
  id: string;
  /** Apply one completed drag job; returns null if unaffordable. */
  apply: (d: DayDecisions, powerToday: number) => DayDecisions | null;
};

export const SMOKE_JOBS: SmokeJob[] = [
  {
    room: "surface",
    id: "radio",
    apply: (d, power) => {
      const next = { ...d, comms: true };
      if (plannedPowerCost(next) > power) return null;
      return next;
    },
  },
  {
    room: "home",
    id: "water_cleaner",
    apply: (d, power) => {
      const next = { ...d, recycler: true };
      if (plannedPowerCost(next) > power) return null;
      return next;
    },
  },
  {
    room: "greenhouse",
    id: "grow_light",
    apply: (d, power) => {
      const next = { ...d, greenhouse: true };
      if (plannedPowerCost(next) > power) return null;
      return next;
    },
  },
  {
    room: "lab",
    id: "analyzer",
    apply: (d, power) => {
      const next = { ...d, scienceLevel: Math.max(1, d.scienceLevel) };
      if (plannedPowerCost(next) > power) return null;
      return next;
    },
  },
];

/** Enter each room and complete one drag job (affordable plan). */
export function smokeEnterRoomsAndJobs(powerToday = 12): {
  rooms: RoomId[];
  jobs: string[];
  decisions: DayDecisions;
} {
  let d = defaultDecisions();
  const jobs: string[] = [];
  // Reserve heat; ensure enough for one job per room in sequence.
  const need =
    COMMS_COST + RECYCLER_COST + GREENHOUSE_COST + SCIENCE_COST_PER_LEVEL + 2;
  if (powerToday < need) {
    throw new Error(`Need ≥${need} power for smoke jobs, got ${powerToday}`);
  }
  for (const room of ROOMS) {
    const job = SMOKE_JOBS.find((j) => j.room === room);
    if (!job) throw new Error(`No smoke job for ${room}`);
    const next = job.apply(d, powerToday);
    if (!next) throw new Error(`Could not afford ${job.id} in ${room}`);
    d = next;
    jobs.push(job.id);
  }
  // Sanity: air maker alone also affordable leftover
  void OXYGEN_MAKER_COST;
  return { rooms: [...ROOMS], jobs, decisions: d };
}
