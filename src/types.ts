/** Shared types from Nova's Moon Mission SPEC (Section 3.3 + events). */

/** Provenance badge on every number shown in the game. */
export type SourceBadge =
  | "LIVE"
  | "ARCHIVED"
  | "REFERENCE"
  | "ASSUMPTION"
  | "STORY"
  /** Greenhouse / biology cards tied to an OSDR study (SPEC Section 5). */
  | "OSDR";

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
  /** 1 = full recycler; 0.5 = dust-clogged (SPEC Section 5). */
  recyclerEfficiency: number;
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
  /** Absolute efficiency to set (e.g. 0.5 after skipping dust clean). */
  recyclerEfficiency?: number;
  scienceThatDay?: number;
  sheltered?: boolean;
  /**
   * If set with riskMaterials, seeded resolve may apply that materials loss
   * (e.g. delayed-message 1-in-4 mistake).
   */
  riskChance?: number;
  riskMaterials?: number;
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

/** NASA still shown first on a card (Section 4.5); credit sits under the picture. */
export type EventImage = {
  slot: string;
  nasaId: string;
  src: string;
  alt: string;
  /** Exact credit line from the Image Library record, e.g. "Image: NASA/…". */
  credit: string;
  pageUrl: string;
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
  /** Real NASA picture + credit under it (Section 4.5). */
  image?: EventImage;
  /** Present on storm cards built from DONKI (YYYY-MM-DD). */
  eventDate?: string;
  /** Flare-derived severity when this is a storm card. */
  stormSeverity?: 1 | 2 | 3;
  /** DONKI flare / CME ids when known. */
  donkiFlareId?: string;
  donkiCmeId?: string;
};
