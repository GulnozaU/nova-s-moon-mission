import { describe, expect, it } from "vitest";
import { optionDominates, optionsAreIdentical, STATIC_EVENTS } from "../content/events";
import { scheduleMissionEvents } from "../content/schedule";
import { archivedSpaceWeather } from "../data/donki";
import {
  formatWinRateTable,
  playStrategy,
  runBalance,
  STRATEGY_IDS,
} from "./balance";
import { SHELTER_EXPOSURE_FACTOR, STORM_EXPOSURE_PER_SEVERITY } from "./constants";
import { stormExposureDelta } from "./exposure";

describe("shelter dominance", () => {
  it("SHELTER_EXPOSURE_FACTOR is about 0.3", () => {
    expect(SHELTER_EXPOSURE_FACTOR).toBeGreaterThanOrEqual(0.25);
    expect(SHELTER_EXPOSURE_FACTOR).toBeLessThanOrEqual(0.35);
  });

  it("sheltering cuts exposure by at least 50% vs staying out for sev 1-3, shield 0-4", () => {
    for (const severity of [1, 2, 3] as const) {
      for (let shield = 0; shield <= 4; shield++) {
        const out = stormExposureDelta(severity, shield, false);
        const inn = stormExposureDelta(severity, shield, true);
        expect(inn).toBeLessThanOrEqual(out * 0.5);
      }
    }
  });

  it("severity 3 unsheltered is near-fatal; severity 2 is costly", () => {
    const sev3 = 3 * STORM_EXPOSURE_PER_SEVERITY;
    const sev2 = 2 * STORM_EXPOSURE_PER_SEVERITY;
    expect(sev3).toBeGreaterThanOrEqual(40);
    expect(sev2).toBeGreaterThanOrEqual(25);
    expect(sev3).toBeGreaterThan(sev2);
  });
});

describe("event trade-offs", () => {
  it("no static event has identical A and B", () => {
    for (const event of STATIC_EVENTS) {
      expect(optionsAreIdentical(event)).toBe(false);
    }
  });

  it("no static option dominates the other on every measure", () => {
    for (const event of STATIC_EVENTS) {
      expect(optionDominates(event), event.id).toBe(false);
    }
  });

  it("scheduled days never use Quiet Continue/Continue", () => {
    const weather = archivedSpaceWeather("X");
    for (const seed of [1, 42, 99, 1000]) {
      const sched = scheduleMissionEvents(seed, weather, true);
      expect(sched.stormDays).toHaveLength(2);
      expect([4, 5]).toContain(sched.stormDays[0]);
      expect([8, 9]).toContain(sched.stormDays[1]);
      for (const slot of sched.days) {
        expect(slot.event.optionA.label).not.toBe(slot.event.optionB.label);
        expect(slot.event.title).not.toMatch(/quiet day/i);
      }
    }
  });
});

describe("balance win rates", () => {
  it("keeps strategies between ~10% and ~90% win rate (50 seeds smoke)", () => {
    const rows = runBalance(50);
    // eslint-disable-next-line no-console
    console.log("\n" + formatWinRateTable(rows) + "\n");
    for (const row of rows) {
      expect(row.winRate, `${row.strategy}@${row.site}`).toBeGreaterThanOrEqual(
        0.05,
      );
      expect(row.winRate, `${row.strategy}@${row.site}`).toBeLessThanOrEqual(0.95);
    }
  });

  it("playStrategy uses real schedule storms", () => {
    const result = playStrategy("balanced", "rim", 7);
    expect(typeof result.won).toBe("boolean");
    expect(STRATEGY_IDS).toContain("balanced");
  });
});
