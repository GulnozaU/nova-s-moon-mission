import { describe, expect, it } from "vitest";
import { DAY1_STEPS, runTutorialScript } from "./tutorial/day1";
import { ROOMS, smokeEnterRoomsAndJobs } from "./jobs/smokeJobs";
import { clipWords, morningTalk, consequenceNovaLine } from "./novaTalk";
import { stormExposureDelta } from "../engine/exposure";
import { createGame, applyDay } from "../engine";
import type { DayDecisions } from "../engine/types";

describe("smoke: rooms + one drag job each", () => {
  it("enters each room and completes one drag job", () => {
    const { rooms, jobs, decisions } = smokeEnterRoomsAndJobs(12);
    expect(rooms).toEqual(["surface", "home", "greenhouse", "lab"]);
    expect(jobs).toEqual(["radio", "water_cleaner", "grow_light", "analyzer"]);
    expect(decisions.comms).toBe(true);
    expect(decisions.recycler).toBe(true);
    expect(decisions.greenhouse).toBe(true);
    expect(decisions.scienceLevel).toBeGreaterThanOrEqual(1);
  });

  it("lists all four places", () => {
    expect(ROOMS).toHaveLength(4);
  });
});

describe("smoke: day-1 tutorial script", () => {
  it("advances only on matching actions through bed", () => {
    const done = runTutorialScript();
    expect(done).toEqual(DAY1_STEPS.map((s) => s.id));
  });
});

describe("smoke: storm crew exposure blend + radio-yesterday", () => {
  it("blends exposure by sheltered crew count", () => {
    const sev = 2 as const;
    const shield = 1;
    const allIn = stormExposureDelta(sev, shield, true);
    const allOut = stormExposureDelta(sev, shield, false);
    const mid = allIn * (2 / 3) + allOut * (1 / 3);
    expect(mid).toBeGreaterThan(allIn);
    expect(mid).toBeLessThan(allOut);
  });

  it("applyDay uses shelteredCrewCount for storm notes", () => {
    let state = createGame("rim", 42).state;
    const decisions: DayDecisions = {
      recycler: false,
      oxygenMaker: false,
      comms: false,
      scienceLevel: 0,
      shelteredCrewCount: 2,
    };
    const event = {
      id: "solar-storm-test",
      title: "Storm",
      sourceBadge: "ARCHIVED" as const,
      explanation: "Test storm",
      eventDate: "2024-01-01",
      realWorldNote: "NASA saw a real flare.",
      optionA: {
        id: "shelter",
        label: "Shelter",
        benefit: "Safer",
        cost: "No outdoor science",
        effects: { sheltered: true },
      },
      optionB: {
        id: "out",
        label: "Stay out",
        benefit: "Science possible",
        cost: "More risk",
        effects: { sheltered: false },
      },
      stormSeverity: 2 as const,
    };
    const result = applyDay(state, decisions, event, "B");
    expect(result.dayLog.notes.some((n) => /2\/3 crew/.test(n))).toBe(true);
  });
});

describe("smoke: nova copy limits", () => {
  it("clips to 25 words", () => {
    const long = Array.from({ length: 40 }, (_, i) => `w${i}`).join(" ");
    expect(clipWords(long, 25).split(/\s+/)).toHaveLength(25);
  });

  it("morning talk returns goal + choices", () => {
    const state = createGame("rim", 1).state;
    const talk = morningTalk(state, null, [], false);
    expect(talk.goal.length).toBeGreaterThan(0);
    expect(talk.choices.length).toBeGreaterThanOrEqual(1);
  });

  it("consequence line stays short", () => {
    const line = consequenceNovaLine([
      { key: "water", before: 10, after: 8 },
    ]);
    expect(line.split(/\s+/).length).toBeLessThanOrEqual(25);
  });
});
