/**
 * Seeded event schedule (SPEC Section 5 / Stage 1).
 * Two real DONKI storms on days 4|5 and 8|9; no fake quiet Continue/Continue cards.
 */

import { MISSION_DAYS } from "../engine/constants";
import { createRng, rngInt } from "../engine/rng";
import { archivedSpaceWeather } from "../data/donki";
import type { SpaceWeatherResult } from "../data/donkiTypes";
import type { OsdrStudy } from "../data/osdrTypes";
import {
  listArchivedOsdrStudies,
  pickOsdrStudy,
} from "../data/osdr";
import type { Event } from "../types";
import { STATIC_EVENTS } from "./events";
import { buildGreenhouseEvent } from "./greenhouse";
import { buildRadiationMattersCard } from "./radiation";
import { buildStormEventAtDay } from "./storm";

export type DaySchedule = {
  day: number;
  event: Event;
  /** Optional teaching card shown after a storm day. */
  afterStormCard?: Event;
};

export type ScheduledStorm = {
  day: number;
  /** Full CME warning days (Comms ON). */
  warningDays: number;
  warningHours: number;
  event: Event;
  weather: SpaceWeatherResult;
};

export type StormAlert = {
  stormDay: number;
  daysUntil: number;
  warningDays: number;
  message: string;
  donkiFlareId?: string;
  eventDate?: string | null;
};

export type MissionSchedule = {
  days: DaySchedule[];
  /** First storm day (compat). */
  stormDay: number;
  stormDays: number[];
  storms: ScheduledStorm[];
  /** First storm full warning days. */
  warningDays: number;
  seed: number;
  greenhouseStudy: OsdrStudy;
  radiationStudy: OsdrStudy;
};

function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rngInt(rng, 0, i);
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

export type ScheduleOptions = {
  seed: number;
  weather: SpaceWeatherResult;
  /** Ignored for storm placement; alerts use daily Comms at runtime. */
  commsOn?: boolean;
  missionDays?: number;
  greenhouseStudies?: OsdrStudy[];
  radiationStudies?: OsdrStudy[];
};

/**
 * Pick two distinct archived (or live+archived) DONKI records for the two storms.
 */
function pickStormWeather(
  seed: number,
  live: SpaceWeatherResult,
): [SpaceWeatherResult, SpaceWeatherResult] {
  const rng = createRng(seed ^ 0xc0ffee);
  // Storm 1: smaller C or M. Storm 2: M or X. Keeps win-rate band reachable.
  const storm1 =
    rng() < 0.55 ? archivedSpaceWeather("C") : archivedSpaceWeather("M");
  const storm2 =
    rng() < 0.5 ? archivedSpaceWeather("M") : archivedSpaceWeather("X");
  // If both landed on the same M record, bump storm2 to X for distinct IDs.
  let a = storm1;
  let b = storm2;
  if (a.strongestFlare?.flrID === b.strongestFlare?.flrID) {
    b = archivedSpaceWeather("X");
  }

  // Prefer LIVE for storm 1 when NASA returned a real flare.
  if (live.source === "LIVE" && live.strongestFlare) {
    const liveId = live.strongestFlare.flrID;
    a = live;
    if (liveId === b.strongestFlare?.flrID) {
      b = archivedSpaceWeather("C");
      if (liveId === b.strongestFlare?.flrID) {
        b = archivedSpaceWeather("M");
      }
    }
  }

  return [a, b];
}

/**
 * Build a mission calendar with storms on day 4|5 and 8|9.
 */
export function scheduleMissionEvents(
  seedOrOptions: number | ScheduleOptions,
  weatherArg?: SpaceWeatherResult,
  _commsOnArg?: boolean,
  missionDaysArg = MISSION_DAYS,
): MissionSchedule {
  const options: ScheduleOptions =
    typeof seedOrOptions === "number"
      ? {
          seed: seedOrOptions,
          weather: weatherArg!,
          missionDays: missionDaysArg,
        }
      : seedOrOptions;

  const { seed, weather, missionDays = MISSION_DAYS } = options;
  const rng = createRng(seed);

  const stormDay1 = rng() < 0.5 ? 4 : 5;
  const stormDay2 = rng() < 0.5 ? 8 : 9;
  const [wx1, wx2] = pickStormWeather(seed, weather);

  const built1 = buildStormEventAtDay(wx1, stormDay1, missionDays);
  const built2 = buildStormEventAtDay(wx2, stormDay2, missionDays);

  // Unique event ids so logs can tell storms apart.
  built1.event = { ...built1.event, id: "solar-storm-1" };
  built2.event = { ...built2.event, id: "solar-storm-2" };

  const storms: ScheduledStorm[] = [
    {
      day: built1.stormDay,
      warningDays: built1.warningDays,
      warningHours: built1.warningHours,
      event: built1.event,
      weather: wx1,
    },
    {
      day: built2.stormDay,
      warningDays: built2.warningDays,
      warningHours: built2.warningHours,
      event: built2.event,
      weather: wx2,
    },
  ];

  const greenhousePool =
    options.greenhouseStudies ??
    listArchivedOsdrStudies().filter(
      (s) => s.role === "greenhouse" || s.role === "general" || !s.role,
    );
  const radiationPool =
    options.radiationStudies ??
    listArchivedOsdrStudies().filter((s) => s.role === "radiation");

  const greenhouseStudy = pickOsdrStudy(
    greenhousePool.length > 0 ? greenhousePool : listArchivedOsdrStudies(),
    seed ^ 0x9e3779b9,
  );
  const radiationStudy = pickOsdrStudy(
    radiationPool.length > 0 ? radiationPool : listArchivedOsdrStudies(),
    seed ^ 0x85ebca6b,
  );

  const stormDaySet = new Set(storms.map((s) => s.day));
  const byDay = new Map<number, DaySchedule>();
  for (const s of storms) {
    byDay.set(s.day, {
      day: s.day,
      event: s.event,
      afterStormCard: buildRadiationMattersCard(radiationStudy),
    });
  }

  const freeDays: number[] = [];
  for (let d = 1; d <= missionDays; d++) {
    if (!stormDaySet.has(d)) freeDays.push(d);
  }
  shuffleInPlace(freeDays, rng);

  const pool = shuffleInPlace(
    STATIC_EVENTS.filter((e) => e.id !== "greenhouse-experiment"),
    rng,
  );
  const greenhouseEvent = buildGreenhouseEvent(greenhouseStudy);

  if (freeDays.length > 0) {
    const gDay = freeDays.shift()!;
    byDay.set(gDay, { day: gDay, event: greenhouseEvent });
  }

  let poolIndex = 0;
  for (const day of freeDays) {
    // Cycle the real event pool — never emit Quiet day Continue/Continue.
    const event = pool[poolIndex % pool.length]!;
    poolIndex += 1;
    byDay.set(day, {
      day,
      event: {
        ...event,
        // Unique id per day so delayed costs / logs stay clear when pool cycles.
        id: `${event.id}-d${day}`,
      },
    });
  }

  const days: DaySchedule[] = [];
  for (let d = 1; d <= missionDays; d++) {
    days.push(byDay.get(d)!);
  }

  return {
    days,
    stormDay: storms[0]!.day,
    stormDays: storms.map((s) => s.day),
    storms,
    warningDays: storms[0]!.warningDays,
    seed,
    greenhouseStudy,
    radiationStudy,
  };
}

/**
 * Storm-coming alerts for today.
 * Comms ON: show if stormDay - day <= warningDays.
 * Comms OFF: show only if <= floor(warningDays / 2).
 */
export function stormAlertsForDay(
  schedule: MissionSchedule,
  day: number,
  commsOn: boolean,
): StormAlert[] {
  const alerts: StormAlert[] = [];
  for (const storm of schedule.storms) {
    const daysUntil = storm.day - day;
    if (daysUntil <= 0) continue;
    const threshold = commsOn
      ? storm.warningDays
      : Math.floor(storm.warningDays / 2);
    if (daysUntil > threshold) continue;
    const n = daysUntil;
    alerts.push({
      stormDay: storm.day,
      daysUntil: n,
      warningDays: storm.warningDays,
      message: `Storm coming in ${n} day${n === 1 ? "" : "s"}.`,
      donkiFlareId: storm.event.donkiFlareId,
      eventDate: storm.event.eventDate,
    });
  }
  return alerts;
}

export function eventForDay(
  schedule: MissionSchedule,
  day: number,
): Event | undefined {
  return schedule.days.find((d) => d.day === day)?.event;
}
