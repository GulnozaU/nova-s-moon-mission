/** Shared types from Nova's Moon Mission SPEC (Section 3.3 + events). */

/** Provenance badge on every number shown in the game. */
export type SourceBadge =
  | "LIVE"
  | "ARCHIVED"
  | "REFERENCE"
  | "ASSUMPTION"
  | "STORY";

export type SiteId = "rim" | "plain";

/** One day's recorded decisions and outcomes (replay / end report). */
export type DayLog = {
  day: number;
  powerSpent: {
    heat: number;
    recycler: boolean;
    oxygenMaker: boolean;
    comms: boolean;
    scienceLevel: number;
    greenhouse: boolean;
  };
  eventId: string;
  choice: "A" | "B";
  sheltered: boolean;
  battery: number;
  water: number;
  oxygen: number;
  materials: number;
  shieldLevel: number;
  panelBonus: number;
  exposure: number;
  science: number;
  notes: string[];
};

export type GameState = {
  day: number; // 1..10
  site: SiteId;
  battery: number; // stored power chips, cap 20
  water: number; // start 40
  oxygen: number; // start 30
  materials: number; // start 10
  shieldLevel: number; // 0..4
  panelBonus: number; // extra chips per day from built panels
  exposure: number; // 0..100, never goes down on its own
  science: number; // score
  log: DayLog[]; // every decision, for the replay screen
};

/** Engine deltas applied when a player picks an event option. */
export type EventEffects = {
  water?: number;
  oxygen?: number;
  materials?: number;
  battery?: number;
  science?: number;
  exposure?: number;
  shieldLevel?: number;
  panelBonus?: number;
  recyclerEfficiency?: number;
  scienceThatDay?: number;
  sheltered?: boolean;
};

export type EventOption = {
  id: string;
  label: string;
  /** Kid-facing benefit text shown before confirm. */
  benefit: string;
  /** Kid-facing cost text shown before confirm. */
  cost: string;
  effects: EventEffects;
};

/** One daily event card (Section 5 / Prompt 3). */
export type Event = {
  id: string;
  title: string;
  sourceBadge: SourceBadge;
  /** Plain-language explanation for ages 7 to 12. */
  explanation: string;
  optionA: EventOption;
  optionB: EventOption;
  /** One accurate NASA-context sentence; omit unverified claims. */
  realWorldNote: string;
};
