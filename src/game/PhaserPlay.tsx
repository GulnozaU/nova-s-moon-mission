import { useEffect, useRef } from "react";
import type { DayDecisions } from "../engine/types";
import type { Event, GameState } from "../types";
import type { SpaceWeatherResult } from "../data/donkiTypes";
import { plannedPowerCost } from "../ui/powerMath";
import { moonBridgeRef, type PlayMode } from "./bridge";
import { createMoonGame } from "./createMoonGame";
import "./phaser-play.css";

type Props = {
  state: GameState;
  weather: SpaceWeatherResult;
  event: Event | null;
  decisions: DayDecisions;
  powerToday: number;
  mode: PlayMode;
  onDecisions: (d: DayDecisions | ((p: DayDecisions) => DayDecisions)) => void;
  onPlanPower: () => void;
  onReadyForEvent: () => void;
  onChoose: (c: "A" | "B") => void;
  onOpenGlossary: () => void;
};

/**
 * Full-canvas 2D adventure (Henry-farm style).
 * Trade-offs + choices live inside Phaser dialogs — not stacked React panels.
 */
export function PhaserPlay({
  state,
  decisions,
  powerToday,
  mode,
  event,
  onDecisions,
  onPlanPower,
  onReadyForEvent,
  onChoose,
  onOpenGlossary,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<ReturnType<typeof createMoonGame> | null>(null);
  const latest = useRef({
    state,
    decisions,
    powerToday,
    mode,
    event,
    onDecisions,
    onPlanPower,
    onReadyForEvent,
    onChoose,
    onOpenGlossary,
  });
  latest.current = {
    state,
    decisions,
    powerToday,
    mode,
    event,
    onDecisions,
    onPlanPower,
    onReadyForEvent,
    onChoose,
    onOpenGlossary,
  };

  useEffect(() => {
    moonBridgeRef.current = {
      getDay: () => latest.current.state.day,
      getMode: () => latest.current.mode,
      getDecisions: () => latest.current.decisions,
      getPowerToday: () => latest.current.powerToday,
      getPowerSpent: () => plannedPowerCost(latest.current.decisions),
      getState: () => latest.current.state,
      getEvent: () => latest.current.event,
      getHint: () => "Every ON helps and costs.",
      patchDecisions: (patch) =>
        latest.current.onDecisions({ ...latest.current.decisions, ...patch }),
      setDecisions: (d) => latest.current.onDecisions(d),
      goPowerCheck: () => latest.current.onPlanPower(),
      goChoice: () => latest.current.onReadyForEvent(),
      choose: (c) => latest.current.onChoose(c),
      openGlossary: () => latest.current.onOpenGlossary(),
    };

    if (!hostRef.current || gameRef.current) return;
    gameRef.current = createMoonGame(hostRef.current);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      moonBridgeRef.current = null;
    };
  }, []);

  // Keep bridge hot when React props change (mode → Phaser modals)
  useEffect(() => {
    if (!moonBridgeRef.current) return;
    moonBridgeRef.current = {
      ...moonBridgeRef.current,
      getMode: () => latest.current.mode,
      getDecisions: () => latest.current.decisions,
      getEvent: () => latest.current.event,
      getPowerToday: () => latest.current.powerToday,
      getState: () => latest.current.state,
      getDay: () => latest.current.state.day,
    };
  }, [mode, decisions, event, powerToday, state]);

  return (
    <section className="phaser-play phaser-play--fullscreen">
      <div className="phaser-play__canvas" ref={hostRef} />
      <p className="phaser-play__hint">
        Move with arrows · click buildings · <strong>Plan day</strong> for trade-offs ·
        grab tools show on Nova
      </p>
    </section>
  );
}
