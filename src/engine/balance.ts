/**
 * Strategy balance runner (Stage 1b).
 * Survive = last all 10 days. Success = survive AND science ≥ SCIENCE_SUCCESS_TARGET.
 * Includes an adaptive "smart" bot that reacts to storm alerts.
 */

import { archivedSpaceWeather } from "../data/donki";
import {
  scheduleMissionEvents,
  stormAlertsForDay,
  type MissionSchedule,
} from "../content/schedule";
import { applyDay } from "./applyDay";
import {
  MISSION_DAYS,
  PLAIN_LIT_DAYS,
  SCIENCE_SUCCESS_TARGET,
} from "./constants";
import { createGame } from "./createGame";
import type { DayDecisions, StormEvent } from "./types";
import type { GameState, SiteId } from "../types";

export type StrategyId =
  | "all_science"
  | "all_safety"
  | "balanced"
  | "greenhouse_heavy"
  | "random"
  | "smart";

/** Fixed strategies only (no adaptive smart bot). */
export const FIXED_STRATEGY_IDS: Exclude<StrategyId, "smart">[] = [
  "all_science",
  "all_safety",
  "balanced",
  "greenhouse_heavy",
  "random",
];

export const STRATEGY_IDS: StrategyId[] = [...FIXED_STRATEGY_IDS, "smart"];

export type BalanceRow = {
  strategy: StrategyId;
  site: SiteId;
  seeds: number;
  survives: number;
  successes: number;
  surviveRate: number;
  successRate: number;
  /** @deprecated use surviveRate — kept for older callers */
  wins: number;
  winRate: number;
};

type DecideCtx = {
  day: number;
  isStorm: boolean;
  rng: () => number;
  materials: number;
  shieldLevel: number;
  recyclerEfficiency: number;
  site: SiteId;
  battery: number;
  science: number;
  schedule: MissionSchedule;
  state: GameState;
  event: StormEvent;
};

type StrategyFn = (ctx: DecideCtx) => {
  decisions: DayDecisions;
  choice: "A" | "B";
};

const strategies: Record<StrategyId, StrategyFn> = {
  all_science: ({ day, isStorm, materials, shieldLevel, recyclerEfficiency }) => ({
    decisions: {
      recycler: true,
      oxygenMaker: true,
      comms: false,
      scienceLevel: 4,
      greenhouse: false,
      buildShield: materials >= 2 && shieldLevel < 2 && day <= 3,
      buildPanel: false,
      cleanFilter: recyclerEfficiency < 1 && materials >= 1,
    },
    choice: isStorm ? "B" : "A",
  }),

  // Shelters but never does science — cannot succeed (needs SCIENCE_SUCCESS_TARGET).
  all_safety: ({ isStorm, materials, recyclerEfficiency }) => ({
    decisions: {
      recycler: true,
      oxygenMaker: true,
      comms: true,
      scienceLevel: 0,
      greenhouse: false,
      buildShield: false,
      buildPanel: false,
      cleanFilter: recyclerEfficiency < 1 && materials >= 1,
    },
    choice: isStorm ? "A" : "A",
  }),

  // Mixed: science + one shield. Risks the early storm (not fully adaptive).
  balanced: ({
    day,
    isStorm,
    materials,
    shieldLevel,
    recyclerEfficiency,
    site,
    event,
  }) => {
    let choice: "A" | "B" = "A";
    if (isStorm) {
      // Stay out on first storm — costs many runs; keeps success ≤60%.
      choice = day <= 5 ? "B" : "A";
    } else if (event.optionA.effects.scienceThatDay === 0) {
      choice = "B";
    }
    return {
      decisions: {
        recycler: true,
        oxygenMaker: true,
        comms: true,
        scienceLevel: site === "plain" ? 1 : 2,
        greenhouse: day % 5 === 0,
        buildShield: materials >= 2 && shieldLevel < 1 && day <= 4,
        buildPanel: false,
        cleanFilter: recyclerEfficiency < 1 && materials >= 1,
      },
      choice,
    };
  },

  // Plants when water allows; one early shield; stays out in storms (risky).
  // Greenhouse is useful (+science/+O₂) but costly (power, water, storm risk).
  greenhouse_heavy: ({
    day,
    isStorm,
    materials,
    shieldLevel,
    recyclerEfficiency,
    state,
    site,
  }) => {
    const isPlainNight = site === "plain" && day > PLAIN_LIT_DAYS;
    const bankForNight = site === "plain" && day === PLAIN_LIT_DAYS;
    return {
      decisions: {
        recycler: true,
        // Plain: bank air-maker power for nights; rim runs air every day.
        oxygenMaker: site === "rim" ? true : isPlainNight || bankForNight,
        comms: false,
        scienceLevel: 0,
        greenhouse:
          !isStorm &&
          !bankForNight &&
          state.water >= 10,
        buildShield: materials >= 2 && shieldLevel < 1 && day <= 2,
        buildPanel: false,
        cleanFilter: recyclerEfficiency < 1 && materials >= 1,
      },
      // Stay out in storms — plants help, but storms still hurt.
      choice: isStorm ? "B" : "A",
    };
  },

  random: ({
    isStorm,
    rng,
    materials,
    shieldLevel,
    recyclerEfficiency,
  }) => ({
    decisions: {
      recycler: rng() < 0.75,
      oxygenMaker: rng() < 0.8,
      comms: rng() < 0.6,
      scienceLevel: Math.floor(rng() * 3),
      greenhouse: rng() < 0.3,
      buildShield: materials >= 2 && shieldLevel < 4 && rng() < 0.45,
      buildPanel: materials >= 3 && rng() < 0.2,
      cleanFilter: recyclerEfficiency < 1 && materials >= 1 && rng() < 0.8,
    },
    choice: isStorm ? (rng() < 0.65 ? "A" : "B") : rng() < 0.5 ? "A" : "B",
  }),

  /**
   * Adaptive bot: Comms on → read storm alerts, build shields & bank power
   * before storms, shelter on impact, bank battery before plain nights,
   * recycler always on, science on safe days to hit the goal.
   */
  smart: ({
    day,
    isStorm,
    materials,
    shieldLevel,
    recyclerEfficiency,
    site,
    science,
    schedule,
    event,
  }) => {
    const alerts = stormAlertsForDay(schedule, day, true);
    const stormComing = alerts.length > 0;
    const daysToStorm =
      alerts.length > 0
        ? Math.min(...alerts.map((a) => a.daysUntil))
        : 99;
    const isPlainNight = site === "plain" && day > PLAIN_LIT_DAYS;
    const bankForNight =
      site === "plain" && day === PLAIN_LIT_DAYS;
    const needScience = science < SCIENCE_SUCCESS_TARGET;
    const needShields = shieldLevel < 2;

    // Prefer the event option that does not wipe today's science when we still need it.
    const eventChoice = (): "A" | "B" => {
      if (isStorm) return "A";
      if (
        needScience &&
        event.optionA.effects.scienceThatDay === 0 &&
        event.optionB.effects.scienceThatDay !== 0
      ) {
        return "B";
      }
      if (
        needScience &&
        (event.optionA.effects.science ?? 0) < (event.optionB.effects.science ?? 0)
      ) {
        return "B";
      }
      return "A";
    };

    // Storm day: shelter, keep life support, no outdoor science.
    if (isStorm) {
      return {
        decisions: {
          recycler: true,
          oxygenMaker: true,
          comms: true,
          scienceLevel: 0,
          greenhouse: false,
          buildShield: materials >= 2 && needShields,
          buildPanel: false,
          cleanFilter: recyclerEfficiency < 1 && materials >= 1,
        },
        choice: "A",
      };
    }

    // Day before storm: build shields, bank power.
    if (stormComing && daysToStorm <= 1) {
      return {
        decisions: {
          recycler: true,
          oxygenMaker: true,
          comms: true,
          scienceLevel: 0,
          greenhouse: false,
          buildShield: materials >= 2 && needShields,
          buildPanel: false,
          cleanFilter: recyclerEfficiency < 1 && materials >= 1,
        },
        choice: eventChoice(),
      };
    }

    // Plain night: heat + cleaner + air; greenhouse if science still short.
    if (isPlainNight) {
      return {
        decisions: {
          recycler: true,
          oxygenMaker: true,
          comms: false,
          scienceLevel: 0,
          greenhouse: needScience,
          buildShield: false,
          buildPanel: false,
          cleanFilter: false,
        },
        choice: eventChoice(),
      };
    }

    /**
     * Plain lit day (8 chips): heat2 + recycler2 + oxy2 + science2 = 8.
     * Day 5 drops science to bank 2 chips for nights (air maker needs battery).
     */
    if (site === "plain") {
      return {
        decisions: {
          recycler: true,
          oxygenMaker: true,
          comms: false,
          scienceLevel: needScience && !bankForNight ? 2 : 0,
          greenhouse: false,
          buildShield: materials >= 2 && needShields,
          buildPanel: false,
          cleanFilter: false,
        },
        choice: eventChoice(),
      };
    }

    return {
      decisions: {
        recycler: true,
        oxygenMaker: true,
        comms: true,
        scienceLevel: needScience ? (stormComing ? 2 : 3) : 0,
        greenhouse: needScience && day % 2 === 0,
        buildShield: materials >= 2 && needShields && day <= 4,
        buildPanel: false,
        cleanFilter: recyclerEfficiency < 1 && materials >= 1,
      },
      choice: eventChoice(),
    };
  },
};

export type PlayResult = {
  survived: boolean;
  won: boolean;
  lost: boolean;
  science: number;
  dayReached: number;
};

/** Play one full mission for a strategy/site/seed using the real schedule. */
export function playStrategy(
  strategy: StrategyId,
  site: SiteId,
  seed: number,
): PlayResult {
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
    const { decisions, choice } = decide({
      day,
      isStorm,
      rng,
      materials: state.materials,
      shieldLevel: state.shieldLevel,
      recyclerEfficiency: state.recyclerEfficiency ?? 1,
      site,
      battery: state.battery,
      science: state.science,
      schedule,
      state,
      event,
    });
    const result = applyDay(state, decisions, event, choice, rng);
    state = result.state;
    if (result.lost) {
      return {
        survived: false,
        won: false,
        lost: true,
        science: state.science,
        dayReached: day,
      };
    }
    if (result.survived) {
      return {
        survived: true,
        won: result.won,
        lost: false,
        science: state.science,
        dayReached: day,
      };
    }
  }

  return {
    survived: false,
    won: false,
    lost: true,
    science: state.science,
    dayReached: state.day,
  };
}

export function runBalance(
  seeds = 500,
  sites: SiteId[] = ["rim", "plain"],
  strategies: StrategyId[] = STRATEGY_IDS,
): BalanceRow[] {
  const rows: BalanceRow[] = [];
  for (const site of sites) {
    for (const strategy of strategies) {
      let survives = 0;
      let successes = 0;
      for (let s = 0; s < seeds; s++) {
        const seed = s + site.charCodeAt(0) * 10_000 + strategy.length * 1_000;
        const result = playStrategy(strategy, site, seed);
        if (result.survived) survives += 1;
        if (result.won) successes += 1;
      }
      const surviveRate = survives / seeds;
      const successRate = successes / seeds;
      rows.push({
        strategy,
        site,
        seeds,
        survives,
        successes,
        surviveRate,
        successRate,
        wins: survives,
        winRate: surviveRate,
      });
    }
  }
  return rows;
}

export function formatWinRateTable(rows: BalanceRow[]): string {
  const header = [
    "strategy".padEnd(18),
    "site".padEnd(6),
    "surv".padStart(5),
    "surv%".padStart(7),
    "succ".padStart(5),
    "succ%".padStart(7),
  ].join(" ");
  const lines = rows.map((r) =>
    [
      r.strategy.padEnd(18),
      r.site.padEnd(6),
      String(r.survives).padStart(5),
      `${(r.surviveRate * 100).toFixed(1)}%`.padStart(7),
      String(r.successes).padStart(5),
      `${(r.successRate * 100).toFixed(1)}%`.padStart(7),
    ].join(" "),
  );
  return [header, ...lines].join("\n");
}

/** Best fixed strategy by success rate for a site. */
export function bestFixedStrategyForSite(
  rows: BalanceRow[],
  site: SiteId,
): StrategyId {
  const siteRows = rows.filter(
    (r) => r.site === site && r.strategy !== "smart",
  );
  let best = siteRows[0]!;
  for (const row of siteRows) {
    if (row.successRate > best.successRate) best = row;
  }
  return best.strategy;
}

/** @deprecated prefer bestFixedStrategyForSite */
export function bestStrategyForSite(
  rows: BalanceRow[],
  site: SiteId,
): StrategyId {
  return bestFixedStrategyForSite(rows, site);
}
