import type { Event, GameState, SiteId } from "../types";

/** Player power / build choices for one day (heat is forced, not chosen). */
export type DayDecisions = {
  recycler: boolean;
  oxygenMaker: boolean;
  comms: boolean;
  /** 0..4 science levels; each costs power and sends crew outside. */
  scienceLevel: number;
  /** Optional until greenhouse content ships; default false. */
  greenhouse?: boolean;
  /** Spend materials for +1 shield level this day. */
  buildShield?: boolean;
  /** Spend materials for +1 permanent panel this day. */
  buildPanel?: boolean;
  /**
   * Clean clogged water filter when recyclerEfficiency < 1.
   * Costs 1 material + 1 power from the day's pool / battery.
   */
  cleanFilter?: boolean;
  /**
   * Storm shelter: how many of 3 crew were dragged into Crew home (0..3).
   * Blends sheltered/unsheltered storm exposure. ASSUMPTION (Stage jobs).
   */
  shelteredCrewCount?: number;
};

export type ApplyDayResult = {
  state: GameState;
  dayLog: import("../types").DayLog;
  /** True if water/oxygen/exposure lose conditions were hit. */
  lost: boolean;
  /** Survived all mission days (may still miss the science goal). */
  survived: boolean;
  /**
   * Mission success: survived AND science ≥ SCIENCE_SUCCESS_TARGET.
   * ASSUMPTION target lives in constants.ts.
   */
  won: boolean;
};

export type CreateGameResult = {
  state: GameState;
  seed: number;
  rng: () => number;
};

export type StormEvent = Event & {
  /** Flare-derived severity 1|2|3; only set on storm days. */
  stormSeverity?: 1 | 2 | 3;
};

export type { Event, GameState, SiteId };
