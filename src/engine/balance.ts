/**
 * Fixed-strategy balance runner (SPEC 6b / Prompt 1b).
 * 500 seeds × 5 strategies; win = survive all mission days.
 */

import { applyDay } from "./applyDay";
import { MISSION_DAYS } from "./constants";
import { createGame } from "./createGame";
import { createRng, rngInt } from "./rng";
import type { DayDecisions, StormEvent } from "./types";
import type { SiteId } from "../types";

export type StrategyId =
  | "all_science"
  | "all_safety"
  | "balanced"
  | "greenhouse_heavy"
  | "random";

export const STRATEGY_IDS: StrategyId[] = [
  "all_science",
  "all_safety",
  "balanced",
  "greenhouse_heavy",
  "random",
];

export type BalanceRow = {
  strategy: StrategyId;
  site: SiteId;
  seeds: number;
  wins: number;
  winRate: number;
};

function quietEvent(day: number): StormEvent {
  return {
    id: `quiet-${day}`,
    title: "Quiet day",
    sourceBadge: "STORY",
    explanation: "A calm day on the Moon.",
    optionA: {
      id: "ok",
      label: "Continue",
      benefit: "Stay on plan",
      cost: "No change",
      effects: {},
    },
    optionB: {
      id: "ok-b",
      label: "Continue",
      benefit: "Stay on plan",
      cost: "No change",
      effects: {},
    },
    realWorldNote: "Some days are quiet.",
  };
}

function stormEvent(day: number, severity: 1 | 2 | 3): StormEvent {
  return {
    id: `storm-${day}`,
    title: "Solar storm",
    sourceBadge: "ARCHIVED",
    explanation: "A storm from the Sun is here.",
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

type StrategyFn = (
  day: number,
  isStorm: boolean,
  rng: () => number,
  materials: number,
  shieldLevel: number,
) => { decisions: DayDecisions; choice: "A" | "B" };

const strategies: Record<StrategyId, StrategyFn> = {
  all_science: (day, isStorm, _rng, materials) => ({
    decisions: {
      // Keep recycler on — risk is exposure from staying out, not an auto water fail.
      recycler: true,
      oxygenMaker: true,
      comms: false,
      scienceLevel: 4,
      greenhouse: false,
      buildShield: false,
      buildPanel: materials >= 3 && day <= 2,
    },
    choice: isStorm ? "B" : "A",
  }),

  all_safety: (_day, isStorm, _rng, _materials, _shieldLevel) => ({
    decisions: {
      recycler: true,
      oxygenMaker: true,
      comms: true,
      scienceLevel: 0,
      greenhouse: false,
      // Shelter-only "safety" — no shields. SPEC 6b needs this to lose on rough weeks.
      buildShield: false,
      buildPanel: false,
    },
    choice: isStorm ? "A" : "A",
  }),

  balanced: (day, isStorm, _rng, materials, shieldLevel) => ({
    decisions: {
      recycler: true,
      oxygenMaker: true,
      comms: true,
      scienceLevel: 1,
      greenhouse: day % 4 === 0,
      buildShield: materials >= 2 && shieldLevel < 2 && day <= 4,
      buildPanel: materials >= 3 && day === 2,
    },
    choice: isStorm ? (day === 1 ? "B" : "A") : "A",
  }),

  greenhouse_heavy: (day, isStorm, _rng, materials, shieldLevel) => ({
    decisions: {
      recycler: true,
      oxygenMaker: day % 2 === 1,
      comms: true,
      scienceLevel: 0,
      greenhouse: true,
      buildShield: materials >= 2 && shieldLevel < 1 && day <= 2,
      buildPanel: false,
    },
    // Plants first — sometimes stays out to "check the greenhouse" during storms.
    choice: isStorm ? (day % 3 === 0 ? "B" : "A") : "A",
  }),

  random: (_day, isStorm, rng, materials, shieldLevel) => ({
    decisions: {
      recycler: rng() < 0.75,
      oxygenMaker: rng() < 0.8,
      comms: rng() < 0.6,
      scienceLevel: Math.floor(rng() * 3),
      greenhouse: rng() < 0.3,
      buildShield: materials >= 2 && shieldLevel < 4 && rng() < 0.45,
      buildPanel: materials >= 3 && rng() < 0.2,
    },
    // Bias slightly toward shelter so random is not an auto-loss.
    choice: isStorm ? (rng() < 0.65 ? "A" : "B") : "A",
  }),
};

/** Play one full mission for a strategy/site/seed. */
export function playStrategy(
  strategy: StrategyId,
  site: SiteId,
  seed: number,
): { won: boolean; lost: boolean; science: number; dayReached: number } {
  const { state: start, rng } = createGame(site, seed);
  // Exactly 2 storms (seeded). Severity mix creates win/loss variance (SPEC 6b).
  const stormDays = new Map<number, 1 | 2 | 3>();
  while (stormDays.size < 2) {
    stormDays.set(rngInt(rng, 1, 10), rngInt(rng, 1, 3) as 1 | 2 | 3);
  }

  let state = start;
  const decide = strategies[strategy];

  for (let step = 0; step < MISSION_DAYS; step++) {
    const day = state.day;
    const severity = stormDays.get(day);
    const isStorm = severity !== undefined;
    const event = isStorm
      ? stormEvent(day, severity)
      : quietEvent(day);
    const { decisions, choice } = decide(
      day,
      isStorm,
      rng,
      state.materials,
      state.shieldLevel,
    );
    const result = applyDay(state, decisions, event, choice);
    state = result.state;
    if (result.lost) {
      return {
        won: false,
        lost: true,
        science: state.science,
        dayReached: day,
      };
    }
    if (result.won) {
      return {
        won: true,
        lost: false,
        science: state.science,
        dayReached: day,
      };
    }
  }

  return {
    won: false,
    lost: true,
    science: state.science,
    dayReached: state.day,
  };
}

export function runBalance(
  seeds = 500,
  sites: SiteId[] = ["rim", "plain"],
): BalanceRow[] {
  const rows: BalanceRow[] = [];
  for (const site of sites) {
    for (const strategy of STRATEGY_IDS) {
      let wins = 0;
      for (let s = 0; s < seeds; s++) {
        // Distinct seed space per site/strategy so streams don't collide oddly
        const seed = s + site.charCodeAt(0) * 10_000 + strategy.length * 1_000;
        if (playStrategy(strategy, site, seed).won) wins += 1;
      }
      rows.push({
        strategy,
        site,
        seeds,
        wins,
        winRate: wins / seeds,
      });
    }
  }
  return rows;
}

export function formatWinRateTable(rows: BalanceRow[]): string {
  const header = [
    "strategy".padEnd(18),
    "site".padEnd(6),
    "wins".padStart(5),
    "rate".padStart(8),
  ].join(" ");
  const lines = rows.map((r) =>
    [
      r.strategy.padEnd(18),
      r.site.padEnd(6),
      String(r.wins).padStart(5),
      `${(r.winRate * 100).toFixed(1)}%`.padStart(8),
    ].join(" "),
  );
  return [header, ...lines].join("\n");
}

/** Best strategy by win rate for a site (ties → first in STRATEGY_IDS order). */
export function bestStrategyForSite(
  rows: BalanceRow[],
  site: SiteId,
): StrategyId {
  const siteRows = rows.filter((r) => r.site === site);
  let best = siteRows[0]!;
  for (const row of siteRows) {
    if (row.winRate > best.winRate) best = row;
  }
  return best.strategy;
}
