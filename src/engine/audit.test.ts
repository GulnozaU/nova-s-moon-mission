import { describe, expect, it } from "vitest";
import {
  DECISION_AUDIT,
  findDominantPairs,
  findEmptyBenefitOrCost,
} from "./audit";
import {
  bestFixedStrategyForSite,
  FIXED_STRATEGY_IDS,
  formatWinRateTable,
  runBalance,
} from "./balance";
import {
  DIFFICULTY,
  GREENHOUSE_COST,
  GREENHOUSE_WATER,
  SCIENCE_SUCCESS_TARGET,
} from "./constants";

describe("decision audit (Section 3.9)", () => {
  it("fails if any decision has an empty benefit or cost", () => {
    const problems = findEmptyBenefitOrCost();
    expect(problems).toEqual([]);
  });

  it("no option is better than another on every measure", () => {
    const problems = findDominantPairs();
    expect(problems).toEqual([]);
  });

  it("includes greenhouse with SPEC 3.4 costs", () => {
    const gh = DECISION_AUDIT.find((g) => g.id === "greenhouse");
    expect(gh).toBeDefined();
    expect(GREENHOUSE_COST).toBe(1);
    expect(GREENHOUSE_WATER).toBe(2);
    expect(DIFFICULTY.greenhouseOxygen).toBe(1);
    expect(DIFFICULTY.greenhouseScience).toBe(1);
  });
});

describe("balance (Stage 1b)", () => {
  it(
    "smart beats fixed strategies; fixed success ≤60%; print survive+success table",
    () => {
      const rows = runBalance(500);
      // eslint-disable-next-line no-console
      console.log("\n" + formatWinRateTable(rows) + "\n");
      // eslint-disable-next-line no-console
      console.log(`scienceSuccessTarget=${SCIENCE_SUCCESS_TARGET}`);

      for (const site of ["rim", "plain"] as const) {
        const smart = rows.find((r) => r.strategy === "smart" && r.site === site)!;
        expect(smart.successRate, `smart@${site}`).toBeGreaterThanOrEqual(0.85);

        for (const id of FIXED_STRATEGY_IDS) {
          const row = rows.find((r) => r.strategy === id && r.site === site)!;
          expect(row.successRate, `${id}@${site}`).toBeLessThanOrEqual(0.6);
        }

        const bestId = bestFixedStrategyForSite(rows, site);
        const best = rows.find((r) => r.strategy === bestId && r.site === site)!;
        expect(smart.successRate - best.successRate).toBeGreaterThanOrEqual(0.15);

        const balanced = rows.find(
          (r) => r.strategy === "balanced" && r.site === site,
        )!;
        const random = rows.find(
          (r) => r.strategy === "random" && r.site === site,
        )!;
        expect(balanced.successRate).toBeGreaterThanOrEqual(
          random.successRate - 0.001,
        );
      }

      const allSafety = rows.filter((r) => r.strategy === "all_safety");
      for (const row of allSafety) {
        expect(row.successRate, `all_safety@${row.site}`).toBe(0);
      }
    },
    90_000,
  );
});
