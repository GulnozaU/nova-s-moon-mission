/**
 * Fixed-strategy balance runner (SPEC 6b / Stage 1).
 * Uses real scheduleMissionEvents + archived DONKI storms (not 2 random storms).
 * 500 seeds × 5 strategies; win = survive all mission days.
 */

import { archivedSpaceWeather } from "../data/donki";
import { scheduleMissionEvents } from "../content/schedule";
import { applyDay } from "./applyDay";
import { MISSION_DAYS } from "./constants";
import { createGame } from "./createGame";
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

type StrategyFn = (
  day: number,
  isStorm: boolean,
  rng: () => number,
  materials: number,
  shieldLevel: number,
  recyclerEfficiency: number,
  site: SiteId,
) => { decisions: DayDecisions; choice: "A" | "B" };

const strategies: Record<StrategyId, StrategyFn> = {
  // Stays out in storms; light shields only — big weeks fail, mild weeks can win.
  all_science: (day, isStorm, _rng, materials, shieldLevel, eff) => ({
    decisions: {
      recycler: true,
      oxygenMaker: true,
      comms: false,
      scienceLevel: 4,
      greenhouse: false,
      buildShield: materials >= 2 && shieldLevel < 2 && day <= 3,
      buildPanel: false,
      cleanFilter: eff < 1 && materials >= 1,
    },
    choice: isStorm ? "B" : "A",
  }),

  // Shelters every storm; never builds shields — rough weeks should still fail sometimes.
  all_safety: (_day, isStorm, _rng, materials, _s, eff) => ({
    decisions: {
      recycler: true,
      oxygenMaker: true,
      comms: true,
      scienceLevel: 0,
      greenhouse: false,
      buildShield: false,
      buildPanel: false,
      cleanFilter: eff < 1 && materials >= 1,
    },
    choice: isStorm ? "A" : "A",
  }),

  // Builds one shield; stays out on the early storm. Plain also risks the late storm.
  balanced: (day, isStorm, _rng, materials, shieldLevel, eff, site) => ({
    decisions: {
      recycler: true,
      oxygenMaker: true,
      comms: true,
      scienceLevel: 1,
      greenhouse: day % 5 === 0,
      buildShield: materials >= 2 && shieldLevel < 1 && day <= 4,
      buildPanel: false,
      cleanFilter: eff < 1 && materials >= 1,
    },
    choice: isStorm
      ? day <= 5 || site === "plain"
        ? "B"
        : "A"
      : "A",
  }),

  // Plants every day — strong on rim power, fragile on plain nights + water.
  greenhouse_heavy: (day, isStorm, _rng, materials, shieldLevel, eff) => ({
    decisions: {
      recycler: true,
      oxygenMaker: true,
      comms: false,
      scienceLevel: 0,
      greenhouse: true,
      buildShield: materials >= 2 && shieldLevel < 1 && day <= 2,
      buildPanel: false,
      cleanFilter: eff < 1 && materials >= 1,
    },
    choice: isStorm ? (day >= 8 ? "B" : "A") : "A",
  }),

  random: (_day, isStorm, rng, materials, shieldLevel, eff) => ({
    decisions: {
      recycler: rng() < 0.75,
      oxygenMaker: rng() < 0.8,
      comms: rng() < 0.6,
      scienceLevel: Math.floor(rng() * 3),
      greenhouse: rng() < 0.3,
      buildShield: materials >= 2 && shieldLevel < 4 && rng() < 0.45,
      buildPanel: materials >= 3 && rng() < 0.2,
      cleanFilter: eff < 1 && materials >= 1 && rng() < 0.8,
    },
    choice: isStorm ? (rng() < 0.65 ? "A" : "B") : rng() < 0.5 ? "A" : "B",
  }),
};

/** Play one full mission for a strategy/site/seed using the real schedule. */
export function playStrategy(
  strategy: StrategyId,
  site: SiteId,
  seed: number,
): { won: boolean; lost: boolean; science: number; dayReached: number } {
  const { state: start, rng } = createGame(site, seed);
  const weather = archivedSpaceWeather("X");
  const schedule = scheduleMissionEvents({
    seed,
    weather,
    greenhouseStudies: undefined,
  });

  let state = start;
  const decide = strategies[strategy];

  for (let step = 0; step < MISSION_DAYS; step++) {
    const day = state.day;
    const slot = schedule.days.find((d) => d.day === day);
    const event = (slot?.event ?? schedule.days[0]!.event) as StormEvent;
    const isStorm = event.stormSeverity !== undefined;
    const { decisions, choice } = decide(
      day,
      isStorm,
      rng,
      state.materials,
      state.shieldLevel,
      state.recyclerEfficiency ?? 1,
      site,
    );
    const result = applyDay(state, decisions, event, choice, rng);
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
