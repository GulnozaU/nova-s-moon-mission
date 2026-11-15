import type { DayDecisions } from "../engine/types";
import type { Event, GameState, SourceBadge } from "../types";
import type { StormAlert } from "../content/schedule";

export type PlayMode = "explore" | "power" | "choose" | "result";

/** Shown on the in-world consequence card (no scrolling DayResult page). */
export type BridgeDelta = {
  key: string;
  label: string;
  before: number;
  after: number;
  why: string;
  badge: SourceBadge;
};

export type MoonBridge = {
  getDay: () => number;
  getMode: () => PlayMode;
  getDecisions: () => DayDecisions;
  getPowerToday: () => number;
  getPowerSpent: () => number;
  getState: () => GameState;
  getEvent: () => Event | null;
  getHint: () => string;
  getDeltas: () => BridgeDelta[];
  getStormAlerts: () => StormAlert[];
  getTomorrowHint: () => string;
  ready: () => boolean;
  patchDecisions: (patch: Partial<DayDecisions>) => void;
  setDecisions: (d: DayDecisions) => void;
  goPowerCheck: () => void;
  goChoice: () => void;
  choose: (c: "A" | "B") => void;
  continueAfterResult: () => void;
  openGlossary: () => void;
};

/** Mutable handle Phaser scenes read each frame / on interact. */
export const moonBridgeRef: { current: MoonBridge | null } = { current: null };

const EMPTY_STATE: GameState = {
  day: 1,
  site: "rim",
  battery: 0,
  water: 0,
  oxygen: 0,
  materials: 0,
  shieldLevel: 0,
  panelBonus: 0,
  exposure: 0,
  science: 0,
  recyclerEfficiency: 1,
  pending: [],
  log: [],
};

/** No-op stub so Phaser never throws before React wires the bridge. */
function stubBridge(): MoonBridge {
  return {
    getDay: () => 1,
    getMode: () => "explore",
    getDecisions: () => ({
      recycler: false,
      oxygenMaker: false,
      comms: false,
      scienceLevel: 0,
      greenhouse: false,
      cleanFilter: false,
    }),
    getPowerToday: () => 0,
    getPowerSpent: () => 0,
    getState: () => EMPTY_STATE,
    getEvent: () => null,
    getHint: () => "",
    getDeltas: () => [],
    getStormAlerts: () => [],
    getTomorrowHint: () => "",
    ready: () => false,
    patchDecisions: () => undefined,
    setDecisions: () => undefined,
    goPowerCheck: () => undefined,
    goChoice: () => undefined,
    choose: () => undefined,
    continueAfterResult: () => undefined,
    openGlossary: () => undefined,
  };
}

/** Always safe — returns a live bridge or a no-op stub. Ignore input until ready(). */
export function bridge(): MoonBridge {
  return moonBridgeRef.current ?? stubBridge();
}

export function bridgeReady(): boolean {
  return Boolean(moonBridgeRef.current?.ready());
}
