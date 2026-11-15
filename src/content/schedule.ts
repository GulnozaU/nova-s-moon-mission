/**
 * Seeded event schedule (SPEC Section 5 / Prompt 3 + 3b).
 * Storm lands after DONKI warning time; greenhouse + radiation cards use OSDR.
 */

import { MISSION_DAYS } from "../engine/constants";
import { createRng, rngInt } from "../engine/rng";
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
import { buildStormEvent } from "./storm";

export type DaySchedule = {
  day: number;
  event: Event;
  /** Optional teaching card shown after a storm day. */
  afterStormCard?: Event;
};

export type MissionSchedule = {
  days: DaySchedule[];
  stormDay: number;
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
  commsOn: boolean;
  missionDays?: number;
  /** Live or archived greenhouse candidates; defaults to archive. */
  greenhouseStudies?: OsdrStudy[];
  /** Live or archived radiation candidates; defaults to archive radiation role. */
  radiationStudies?: OsdrStudy[];
};

/**
 * Build a mission calendar. Greenhouse study is seeded so replays differ.
 */
export function scheduleMissionEvents(
  seedOrOptions: number | ScheduleOptions,
  weatherArg?: SpaceWeatherResult,
  commsOnArg?: boolean,
  missionDaysArg = MISSION_DAYS,
): MissionSchedule {
  const options: ScheduleOptions =
    typeof seedOrOptions === "number"
      ? {
          seed: seedOrOptions,
          weather: weatherArg!,
          commsOn: Boolean(commsOnArg),
          missionDays: missionDaysArg,
        }
      : seedOrOptions;

  const {
    seed,
    weather,
    commsOn,
    missionDays = MISSION_DAYS,
  } = options;

  const rng = createRng(seed);
  const built = buildStormEvent(weather, commsOn, missionDays);

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

  const byDay = new Map<number, DaySchedule>();
  byDay.set(built.stormDay, {
    day: built.stormDay,
    event: built.event,
    afterStormCard: buildRadiationMattersCard(radiationStudy),
  });

  const freeDays: number[] = [];
  for (let d = 1; d <= missionDays; d++) {
    if (d !== built.stormDay) freeDays.push(d);
  }
  shuffleInPlace(freeDays, rng);

  // Replace static greenhouse stub with OSDR-backed card; keep other static events.
  const pool = shuffleInPlace(
    STATIC_EVENTS.filter((e) => e.id !== "greenhouse-experiment"),
    rng,
  );
  const greenhouseEvent = buildGreenhouseEvent(greenhouseStudy);

  // Place greenhouse on the first free day after shuffle for visibility.
  if (freeDays.length > 0) {
    const gDay = freeDays.shift()!;
    byDay.set(gDay, { day: gDay, event: greenhouseEvent });
  }

  let poolIndex = 0;
  for (const day of freeDays) {
    if (poolIndex < pool.length) {
      byDay.set(day, { day, event: pool[poolIndex]! });
      poolIndex += 1;
    } else {
      byDay.set(day, { day, event: quietDay(day) });
    }
  }

  const days: DaySchedule[] = [];
  for (let d = 1; d <= missionDays; d++) {
    days.push(byDay.get(d)!);
  }

  return {
    days,
    stormDay: built.stormDay,
    warningDays: built.warningDays,
    seed,
    greenhouseStudy,
    radiationStudy,
  };
}

function quietDay(day: number): Event {
  return {
    id: `quiet-${day}`,
    title: "Quiet day",
    sourceBadge: "STORY",
    explanation: "No special event today. Keep running the base.",
    optionA: {
      id: "continue",
      label: "Continue",
      benefit: "Stay on your plan",
      cost: "No change from this card",
      effects: {},
    },
    optionB: {
      id: "continue-b",
      label: "Continue",
      benefit: "Stay on your plan",
      cost: "No change from this card",
      effects: {},
    },
    realWorldNote:
      "Some days on the Moon can be calm; this quiet card is a game filler.",
  };
}

export function eventForDay(
  schedule: MissionSchedule,
  day: number,
): Event | undefined {
  return schedule.days.find((d) => d.day === day)?.event;
}
