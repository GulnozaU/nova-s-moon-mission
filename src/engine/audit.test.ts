import { describe, expect, it } from "vitest";
import {
  DECISION_AUDIT,
  findDominantPairs,
  findEmptyBenefitOrCost,
} from "./audit";
import {
  bestStrategyForSite,
  formatWinRateTable,
  runBalance,
} from "./balance";
import { DIFFICULTY, GREENHOUSE_COST, GREENHOUSE_WATER } from "./constants";

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

describe("balance (SPEC 6b)", () => {
  it(
    "500 seeds × 5 strategies stay within 10%..90% win rate",
    () => {
      const rows = runBalance(500);
      // Print for the human (Prompt 1b step 6)
      // eslint-disable-next-line no-console
      console.log("\n" + formatWinRateTable(rows) + "\n");

      for (const row of rows) {
        expect(
          row.winRate,
          `${row.strategy}@${row.site} winRate=${row.winRate}`,
        ).toBeGreaterThanOrEqual(0.1);
        expect(
          row.winRate,
          `${row.strategy}@${row.site} winRate=${row.winRate}`,
        ).toBeLessThanOrEqual(0.9);
      }

      const bestRim = bestStrategyForSite(rows, "rim");
      const bestPlain = bestStrategyForSite(rows, "plain");
      // eslint-disable-next-line no-console
      console.log(`best rim=${bestRim} best plain=${bestPlain}`);
      expect(bestRim).not.toBe(bestPlain);
    },
    60_000,
  );
});
