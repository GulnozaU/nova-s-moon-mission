import { describe, expect, it } from "vitest";
import { applyDay } from "./applyDay";
import {
  BATTERY_CAP,
  DIFFICULTY,
  SHIELD_REDUCTION_PER_LEVEL,
  STORM_EXPOSURE_PER_SEVERITY,
} from "./constants";
import { createGame } from "./createGame";
import { stormExposureDelta } from "./exposure";
import type { DayDecisions, StormEvent } from "./types";
import type { GameState, SourceBadge } from "../types";

const BADGE: SourceBadge = "STORY";

function noopEvent(id = "quiet-day"): StormEvent {
  return {
    id,
    title: "Quiet day",
    sourceBadge: BADGE,
    explanation: "Nothing unusual today.",
    optionA: {
      id: "continue",
      label: "Continue",
      benefit: "Stay on plan",
      cost: "No change",
      effects: {},
    },
    optionB: {
      id: "continue-b",
      label: "Continue",
      benefit: "Stay on plan",
      cost: "No change",
      effects: {},
    },
    realWorldNote: "Some days on the Moon are calm.",
  };
}

function stormEvent(severity: 1 | 2 | 3): StormEvent {
  return {
    id: "solar-storm",
    title: "Solar storm",
    sourceBadge: "ARCHIVED",
    explanation: "A storm from the Sun is arriving.",
    stormSeverity: severity,
    optionA: {
      id: "shelter",
      label: "Shelter",
      benefit: "Lower exposure",
      cost: "No science today",
      effects: { sheltered: true },
    },
    optionB: {
      id: "stay-out",
      label: "Stay out",
      benefit: "Keep science",
      cost: "Higher exposure",
      effects: { sheltered: false },
    },
    realWorldNote: "NASA watches the Sun for storms.",
  };
}

function baseDecisions(
  overrides: Partial<DayDecisions> = {},
): DayDecisions {
  return {
    recycler: true,
    oxygenMaker: true,
    comms: true,
    scienceLevel: 0,
    greenhouse: false,
    ...overrides,
  };
}

/** Run days 1..throughDay inclusive with the same decisions/event/choice. */
function runDays(
  start: GameState,
  throughDay: number,
  decisions: DayDecisions,
  event: StormEvent = noopEvent(),
  choice: "A" | "B" = "A",
): GameState {
  let state = start;
  while (state.day <= throughDay && state.log.length < throughDay) {
    const currentDay = state.day;
    const result = applyDay(state, decisions, event, choice);
    state = result.state;
    if (result.lost) break;
    if (state.day === currentDay) break; // won / stuck
  }
  return state;
}

describe("engine Section 3", () => {
  it("1) recycler off on Day 3 leads to lower water on Day 8", () => {
    const alwaysOn = createGame("rim", 42).state;
    const turnOffDay3 = createGame("rim", 42).state;

    // Days 1–2: both keep recycler on
    let on = runDays(alwaysOn, 2, baseDecisions({ recycler: true }));
    let off = runDays(turnOffDay3, 2, baseDecisions({ recycler: true }));
    expect(on.water).toBe(off.water);

    // Day 3: one turns recycler off
    on = applyDay(on, baseDecisions({ recycler: true }), noopEvent(), "A").state;
    off = applyDay(
      off,
      baseDecisions({ recycler: false, scienceLevel: 2 }),
      noopEvent(),
      "A",
    ).state;
    expect(off.water).toBeLessThan(on.water);

    // Days 4–8: off keeps recycler off (funding science), on keeps it on
    on = runDays(on, 8, baseDecisions({ recycler: true }));
    off = runDays(
      off,
      8,
      baseDecisions({ recycler: false, scienceLevel: 2 }),
    );

    const onDay8 = on.log.find((l) => l.day === 8);
    const offDay8 = off.log.find((l) => l.day === 8);
    expect(onDay8).toBeDefined();
    expect(offDay8).toBeDefined();
    expect(offDay8!.water).toBeLessThan(onDay8!.water);
  });

  it("2) shelter costs science and cuts exposure", () => {
    const shelteredGame = createGame("rim", 7).state;
    const exposedGame = createGame("rim", 7).state;
    const storm = stormEvent(2);
    const decisions = baseDecisions({ scienceLevel: 2, recycler: true });

    const sheltered = applyDay(shelteredGame, decisions, storm, "A");
    const exposed = applyDay(exposedGame, decisions, storm, "B");

    expect(sheltered.dayLog.sheltered).toBe(true);
    expect(exposed.dayLog.sheltered).toBe(false);
    expect(sheltered.state.science).toBe(0);
    expect(exposed.state.science).toBeGreaterThan(sheltered.state.science);
    expect(sheltered.state.exposure).toBeLessThan(exposed.state.exposure);
  });

  it("3) shield level lowers exposure by SHIELD_REDUCTION_PER_LEVEL per level", () => {
    const severity = 2 as const;
    const base = severity * STORM_EXPOSURE_PER_SEVERITY;
    const r = SHIELD_REDUCTION_PER_LEVEL;

    expect(stormExposureDelta(severity, 0, false)).toBeCloseTo(base, 10);
    expect(stormExposureDelta(severity, 1, false)).toBeCloseTo(base * (1 - r), 10);
    expect(stormExposureDelta(severity, 2, false)).toBeCloseTo(base * (1 - 2 * r), 10);
    expect(stormExposureDelta(severity, 4, false)).toBeCloseTo(base * (1 - 4 * r), 10);

    // Integration: build shields then face the same storm
    let low = createGame("rim", 99).state;
    let high = createGame("rim", 99).state;

    // Pre-build two shield levels on `high` via decisions over two quiet days
    high = applyDay(
      high,
      baseDecisions({ buildShield: true }),
      noopEvent(),
      "A",
    ).state;
    high = applyDay(
      high,
      baseDecisions({ buildShield: true }),
      noopEvent(),
      "A",
    ).state;
    expect(high.shieldLevel).toBe(2);

    // Advance `low` two quiet days with no shields
    low = runDays(low, 2, baseDecisions());

    const storm = stormEvent(2);
    const lowHit = applyDay(low, baseDecisions(), storm, "B");
    const highHit = applyDay(high, baseDecisions(), storm, "B");

    const expectedLow = stormExposureDelta(2, 0, false);
    const expectedHigh = stormExposureDelta(2, 2, false);
    expect(lowHit.state.exposure).toBeCloseTo(expectedLow, 5);
    expect(highHit.state.exposure).toBeCloseTo(expectedHigh, 5);
    expect(highHit.state.exposure).toBeCloseTo(
      lowHit.state.exposure * (1 - 2 * SHIELD_REDUCTION_PER_LEVEL),
      5,
    );
  });

  it("4) battery never exceeds 20", () => {
    let state = createGame("rim", 1).state;
    // Spend almost nothing beyond forced heat → large surplus each day
    for (let i = 0; i < 10; i++) {
      const result = applyDay(
        state,
        baseDecisions({
          recycler: false,
          oxygenMaker: false,
          comms: false,
          scienceLevel: 0,
        }),
        noopEvent(`quiet-${i}`),
        "A",
      );
      state = result.state;
      expect(state.battery).toBeLessThanOrEqual(BATTERY_CAP);
      expect(result.dayLog.battery).toBeLessThanOrEqual(BATTERY_CAP);
      if (result.lost) break;
    }
    expect(state.battery).toBe(BATTERY_CAP);
  });

  it("5) game ends when water, oxygen, or exposure limits are hit", () => {
    // Water → 0
    let dry = createGame("rim", 2).state;
    dry = { ...dry, water: 1, oxygen: 30 };
    const waterLoss = applyDay(
      dry,
      baseDecisions({ recycler: false, oxygenMaker: false }),
      noopEvent("dry"),
      "A",
    );
    expect(waterLoss.lost).toBe(true);
    expect(waterLoss.state.water).toBeLessThanOrEqual(0);

    // Oxygen → 0
    let airless = createGame("rim", 3).state;
    airless = { ...airless, water: 40, oxygen: 2 };
    const o2Loss = applyDay(
      airless,
      baseDecisions({ oxygenMaker: false }),
      noopEvent("airless"),
      "A",
    );
    expect(o2Loss.lost).toBe(true);
    expect(o2Loss.state.oxygen).toBeLessThanOrEqual(0);

    // Exposure → lose threshold
    let toasted = createGame("rim", 4).state;
    toasted = { ...toasted, exposure: DIFFICULTY.loseExposureAt - 1, shieldLevel: 0 };
    const radLoss = applyDay(
      toasted,
      baseDecisions(),
      stormEvent(3),
      "B",
    );
    expect(radLoss.lost).toBe(true);
    expect(radLoss.state.exposure).toBeGreaterThanOrEqual(DIFFICULTY.loseExposureAt);
  });

  it("6) same seed gives same game", () => {
    const decisions: DayDecisions[] = [
      baseDecisions({ scienceLevel: 1 }),
      baseDecisions({ scienceLevel: 2, buildPanel: true }),
      baseDecisions({ recycler: false, scienceLevel: 3 }),
      baseDecisions({ buildShield: true }),
      baseDecisions({ scienceLevel: 1 }),
    ];

    function play(seed: number): GameState {
      let { state, seed: s, rng } = createGame("plain", seed);
      expect(s).toBe(seed);
      // Consume rng the same way both runs would (event scheduling later)
      void [rng(), rng(), rng()];
      for (let i = 0; i < decisions.length; i++) {
        const event =
          i === 3 ? stormEvent(1) : noopEvent(`day-${i + 1}`);
        const choice = i === 3 ? "A" : "B";
        state = applyDay(state, decisions[i]!, event, choice).state;
      }
      return state;
    }

    const a = play(12345);
    const b = play(12345);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.log)).toEqual(JSON.stringify(b.log));

    // Seeded RNG sequences differ by seed and match when seed matches
    const { rng: r1 } = createGame("rim", 1);
    const { rng: r2 } = createGame("rim", 2);
    const seq1 = [r1(), r1(), r1()];
    const seq2 = [r2(), r2(), r2()];
    expect(seq1).not.toEqual(seq2);
    const { rng: r3 } = createGame("rim", 1);
    expect([r3(), r3(), r3()]).toEqual(seq1);
  });
});
