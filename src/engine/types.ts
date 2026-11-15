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
};

export type ApplyDayResult = {
  state: GameState;
  dayLog: import("../types").DayLog;
  /** True if water/oxygen/exposure lose conditions were hit. */
  lost: boolean;
  /** True after successfully completing mission day 10. */
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
