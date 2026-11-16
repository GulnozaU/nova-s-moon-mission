/**
 * Play 10 days five ways; assert engines complete without throw.
 * Also soft-check kid copy length helpers.
 */
import { describe, expect, it } from "vitest";
import { playStrategy, QA_STRATEGY_IDS } from "./balance";
import { clipWords } from "../game/novaTalk";
import { plainTalk, BANNED_TERMS } from "../content/banned";

/** Match useGameSession DEMO_SEED without importing React/Phaser into node tests. */
const DEMO_SEED = 20261115;

describe("QA: five playstyles × 10 days", () => {
  it("runs all science, all safe, balanced, ignore radio, greenhouse-heavy", () => {
    const report: Array<{
      strategy: string;
      site: string;
      survived: boolean;
      won: boolean;
    }> = [];
    for (const strategy of QA_STRATEGY_IDS) {
      for (const site of ["rim", "plain"] as const) {
        const result = playStrategy(strategy, site, DEMO_SEED ^ strategy.length);
        report.push({
          strategy,
          site,
          survived: result.survived,
          won: result.won,
        });
        expect(result.dayReached).toBeGreaterThanOrEqual(1);
        expect(result.dayReached).toBeLessThanOrEqual(10);
      }
    }
    // At least one strategy should survive on rim with this seed band.
    expect(report.some((r) => r.survived)).toBe(true);
  });
});

describe("QA: copy limits and jargon", () => {
  it("clipWords enforces 25 words", () => {
    const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
    expect(clipWords(long, 25).split(/\s+/)).toHaveLength(25);
  });

  it("plainTalk strips banned jargon tokens", () => {
    const raw = "A CME and DONKI class M flare hit; ECLSS held.";
    const plain = plainTalk(raw);
    for (const term of ["CME", "DONKI", "ECLSS"] as const) {
      expect(plain.toLowerCase()).not.toContain(term.toLowerCase());
    }
    void BANNED_TERMS;
  });
});
