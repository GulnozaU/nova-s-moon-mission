import { describe, expect, it } from "vitest";
import { optionDominates, optionsAreIdentical, STATIC_EVENTS } from "../content/events";
import { scheduleMissionEvents } from "../content/schedule";
import { archivedSpaceWeather } from "../data/donki";
import {
  bestFixedStrategyForSite,
  FIXED_STRATEGY_IDS,
  formatWinRateTable,
  playStrategy,
  runBalance,
  STRATEGY_IDS,
} from "./balance";
import {
  SCIENCE_SUCCESS_TARGET,
  SHELTER_EXPOSURE_FACTOR,
  STORM_EXPOSURE_PER_SEVERITY,
} from "./constants";
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

describe("mission success goal", () => {
  it("defines a science success target", () => {
    expect(SCIENCE_SUCCESS_TARGET).toBeGreaterThan(0);
  });

  it("all_safety cannot succeed (no science)", () => {
    for (const site of ["rim", "plain"] as const) {
      for (let s = 0; s < 20; s++) {
        const r = playStrategy("all_safety", site, s + 100);
        expect(r.won, `${site} seed ${s}`).toBe(false);
        if (r.survived) expect(r.science).toBeLessThan(SCIENCE_SUCCESS_TARGET);
      }
    }
  });
});

describe("smart bot vs fixed strategies (Stage 1b)", () => {
  it(
    "smart ≥85% success on both sites and beats best fixed by ≥15pp; fixed ≤60%",
    () => {
      const rows = runBalance(500);
      // eslint-disable-next-line no-console
      console.log("\n" + formatWinRateTable(rows) + "\n");

      for (const site of ["rim", "plain"] as const) {
        const smart = rows.find((r) => r.strategy === "smart" && r.site === site)!;
        expect(smart.successRate, `smart@${site}`).toBeGreaterThanOrEqual(0.85);

        for (const id of FIXED_STRATEGY_IDS) {
          const row = rows.find((r) => r.strategy === id && r.site === site)!;
          expect(
            row.successRate,
            `${id}@${site} success=${row.successRate}`,
          ).toBeLessThanOrEqual(0.6);
        }

        const bestId = bestFixedStrategyForSite(rows, site);
        const best = rows.find((r) => r.strategy === bestId && r.site === site)!;
        expect(
          smart.successRate - best.successRate,
          `smart vs ${bestId}@${site}`,
        ).toBeGreaterThanOrEqual(0.15);

        const balanced = rows.find(
          (r) => r.strategy === "balanced" && r.site === site,
        )!;
        const random = rows.find(
          (r) => r.strategy === "random" && r.site === site,
        )!;
        expect(
          balanced.successRate,
          `balanced vs random@${site}`,
        ).toBeGreaterThanOrEqual(random.successRate - 0.001);
      }
    },
    90_000,
  );

  it("playStrategy returns survive and success flags", () => {
    const result = playStrategy("smart", "rim", 7);
    expect(typeof result.survived).toBe("boolean");
    expect(typeof result.won).toBe("boolean");
    expect(STRATEGY_IDS).toContain("smart");
  });
});
