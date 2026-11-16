/**
 * Depth-world smoke: enter each place and complete one drag job via engine actions.
 */
import { describe, expect, it } from "vitest";
import { createGame } from "../engine";
import { BATTERY_CAP } from "../engine/constants";
import { defaultDecisions } from "../ui/powerMath";
import { interactivesFor } from "./interactives/catalog";
import {
  defaultPlaceFx,
  freePower,
  runInteractive,
} from "./interactives/actions";
import { storyBeatForDay } from "../game/storyLayer";
import { stormAlertsForDay, scheduleMissionEvents } from "../content/schedule";
import { archivedSpaceWeather } from "../data/donki";
import type { PlaceId } from "./types";

const PLACES: PlaceId[] = ["surface", "home", "greenhouse", "lab"];

const JOBS: Array<{
  place: PlaceId;
  id: string;
  payload: { kind: "chip" | "water"; amount: number };
}> = [
  { place: "surface", id: "surface_radio", payload: { kind: "chip", amount: 1 } },
  { place: "home", id: "home_recycler", payload: { kind: "chip", amount: 1 } },
  { place: "greenhouse", id: "gh_light", payload: { kind: "chip", amount: 1 } },
  { place: "lab", id: "lab_analyzer", payload: { kind: "chip", amount: 1 } },
];

describe("depth smoke: places + one drag job each", () => {
  it("lists ≥8 interactives per place", () => {
    for (const p of PLACES) {
      expect(interactivesFor(p).length).toBeGreaterThanOrEqual(8);
    }
  });

  it("enters each place and completes one chip/drag job", () => {
    const { state } = createGame("rim", 99);
    let decisions = defaultDecisions();
    const powerToday = 12;
    let fx = defaultPlaceFx();
    // Lab analyzer needs samples first
    fx = { ...fx, samplesHeld: 2, roverSamples: 2 };
    const rooms: PlaceId[] = [];
    const jobs: string[] = [];

    for (const job of JOBS) {
      rooms.push(job.place);
      const def = interactivesFor(job.place).find((i) => i.id === job.id);
      expect(def).toBeTruthy();

      // Machines that need multiple chips: keep dropping until ON
      let guard = 0;
      while (guard < 4) {
        guard += 1;
        const result = runInteractive({
          def: def!,
          payload: job.payload,
          decisions,
          state,
          powerToday,
          fx,
          near: true,
        });
        expect(result.ok).toBe(true);
        if (result.patch) decisions = { ...decisions, ...result.patch };
        if (result.fx) fx = { ...fx, ...result.fx };
        if (
          (job.id === "surface_radio" && decisions.comms) ||
          (job.id === "home_recycler" && decisions.recycler) ||
          (job.id === "gh_light" && decisions.greenhouse) ||
          (job.id === "lab_analyzer" && (decisions.scienceLevel ?? 0) >= 1)
        ) {
          break;
        }
      }
      jobs.push(job.id);
    }

    expect(rooms).toEqual(PLACES);
    expect(jobs).toEqual(JOBS.map((j) => j.id));
    expect(decisions.comms).toBe(true);
    expect(decisions.recycler).toBe(true);
    expect(decisions.greenhouse).toBe(true);
    expect(decisions.scienceLevel).toBeGreaterThanOrEqual(1);
    expect(freePower(decisions, powerToday, fx.fills)).toBeLessThan(powerToday);
  });
});

describe("depth smoke: engine battery cap + DONKI warnings", () => {
  it("battery cap is 12", () => {
    expect(BATTERY_CAP).toBe(12);
  });

  it("storm warnings require radio yesterday", () => {
    const weather = archivedSpaceWeather("M");
    const schedule = scheduleMissionEvents({ seed: 7, weather });
    const day = Math.max(1, schedule.stormDays[0]! - 1);
    expect(stormAlertsForDay(schedule, day, false)).toEqual([]);
    expect(stormAlertsForDay(schedule, day, true).length).toBeGreaterThan(0);
  });
});

describe("depth smoke: Prompt E story layer", () => {
  it("returns a beat for every day 1–10", () => {
    const base = createGame("rim", 3).state;
    for (let day = 1; day <= 10; day++) {
      const beat = storyBeatForDay(
        { ...base, day },
        null,
        [],
        day > 1,
      );
      expect(beat.day).toBe(day);
      expect(beat.goal.split(/\s+/).length).toBeLessThanOrEqual(25);
      expect(beat.story.split(/\s+/).length).toBeLessThanOrEqual(25);
      expect(beat.choices.length).toBeGreaterThanOrEqual(1);
    }
  });
});
