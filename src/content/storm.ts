/**
 * Build the Section 5 solar-storm card from a LIVE or ARCHIVED DONKI record.
 */

import { severityFromFlareClass } from "../data/severity";
import { warningFromCmeSpeed } from "../data/warning";
import type { SpaceWeatherResult } from "../data/donkiTypes";
import type { Event } from "../types";
import type { StormEvent } from "../engine/types";
import { eventImageFor } from "./images";

export type BuiltStorm = {
  event: StormEvent & Event;
  /** Full warning days from CME speed (comms ON). */
  warningDays: number;
  warningHours: number;
  /** Day index (1..missionDays) when the storm lands. */
  stormDay: number;
};

function kidStormSize(severity: 1 | 2 | 3): string {
  if (severity === 1) return "small";
  if (severity === 2) return "medium";
  return "big";
}

/**
 * Build a storm card for a fixed mission day (Stage 1: days 4/5 and 8/9).
 * Warning days always use full CME travel time (comms ON); UI halves when Comms is OFF.
 */
export function buildStormEventAtDay(
  weather: SpaceWeatherResult,
  stormDay: number,
  missionDays = 10,
): BuiltStorm {
  const flare = weather.strongestFlare;
  if (!flare) {
    throw new Error("buildStormEventAtDay requires a DONKI flare record");
  }

  const severityResult = severityFromFlareClass(flare.classType);
  const severity = (severityResult.severity ?? 1) as 1 | 2 | 3;
  const speed = weather.fastestCme?.mostAccurateSpeedKmS ?? 0;
  const warning = warningFromCmeSpeed(speed > 0 ? speed : 500, true);
  const day = Math.min(missionDays, Math.max(1, stormDay));

  const date =
    weather.eventDate ??
    flare.peakTime?.slice(0, 10) ??
    flare.beginTime.slice(0, 10);
  const size = kidStormSize(severity);

  const event: StormEvent & Event = {
    id: "solar-storm",
    title: "Solar storm",
    sourceBadge: weather.source,
    explanation: `NASA saw a ${size} storm on the Sun. The storm cloud may reach the Moon in about ${warning.warningDays} day${warning.warningDays === 1 ? "" : "s"}. Date: ${date}.`,
    eventDate: date,
    stormSeverity: severity,
    donkiFlareId: flare.flrID,
    donkiCmeId: weather.fastestCme?.activityID,
    optionA: {
      id: "shelter",
      label: "Shelter",
      benefit: "Crew risk stays much lower",
      cost: "No science that day",
      effects: { sheltered: true, scienceThatDay: 0 },
    },
    optionB: {
      id: "stay-out",
      label: "Stay out",
      benefit: "Keep today's science",
      cost: "Crew risk rises a lot",
      effects: { sheltered: false },
    },
    image: eventImageFor("storm"),
    realWorldNote: `DONKI recorded flare ${flare.flrID} (${flare.classType}) on ${date}${weather.fastestCme ? ` with CME ${weather.fastestCme.activityID}` : ""}.`,
  };

  return {
    event,
    warningDays: warning.warningDays,
    warningHours: warning.hours,
    stormDay: day,
  };
}

/**
 * @param weather LIVE or ARCHIVED DONKI summary (must include a flare).
 * @param commsOn Full warning if true; halved if false (SPEC 4.1).
 * @param missionDays Default 10.
 * @deprecated Prefer buildStormEventAtDay for fixed storm days; kept for tests.
 */
export function buildStormEvent(
  weather: SpaceWeatherResult,
  commsOn: boolean,
  missionDays = 10,
): BuiltStorm {
  const flare = weather.strongestFlare;
  if (!flare) {
    throw new Error("buildStormEvent requires a DONKI flare record");
  }
  const speed = weather.fastestCme?.mostAccurateSpeedKmS ?? 0;
  const warning = warningFromCmeSpeed(speed > 0 ? speed : 500, commsOn);
  const stormDay = Math.min(
    missionDays,
    Math.max(1, 1 + warning.warningDays),
  );
  const built = buildStormEventAtDay(weather, stormDay, missionDays);
  // Preserve legacy warningDays that respect commsOn for older callers/tests.
  return {
    ...built,
    warningDays: warning.warningDays,
    warningHours: warning.hours,
    stormDay,
  };
}
