import type { DayDecisions } from "../engine/types";
import type { Event, GameState } from "../types";

export type PlayMode = "explore" | "power" | "choose";

export type MoonBridge = {
  getDay: () => number;
  getMode: () => PlayMode;
  getDecisions: () => DayDecisions;
  getPowerToday: () => number;
  getPowerSpent: () => number;
  getState: () => GameState;
  getEvent: () => Event | null;
  getHint: () => string;
  patchDecisions: (patch: Partial<DayDecisions>) => void;
  setDecisions: (d: DayDecisions) => void;
  goPowerCheck: () => void;
  goChoice: () => void;
  choose: (c: "A" | "B") => void;
  openGlossary: () => void;
};

/** Mutable handle Phaser scenes read each frame / on interact. */
export const moonBridgeRef: { current: MoonBridge | null } = { current: null };

export function bridge(): MoonBridge {
  const b = moonBridgeRef.current;
  if (!b) throw new Error("Moon bridge not ready");
  return b;
}
