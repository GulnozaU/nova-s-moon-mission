import { useEffect, useRef } from "react";
import type { DayDecisions } from "../engine/types";
import type { Event, GameState } from "../types";
import type { SpaceWeatherResult } from "../data/donkiTypes";
import type { StormAlert } from "../content/schedule";
import { plannedPowerCost } from "../ui/powerMath";
import { moonBridgeRef, type BridgeDelta, type PlayMode } from "./bridge";
import { createMoonGame } from "./createMoonGame";
import "./phaser-play.css";

type Props = {
  state: GameState;
  weather: SpaceWeatherResult;
  event: Event | null;
  decisions: DayDecisions;
  powerToday: number;
  mode: PlayMode;
  deltas: BridgeDelta[];
  stormAlerts: StormAlert[];
  tomorrowHint: string;
  /** When false, canvas stays mounted but hidden (no destroy between days). */
  visible: boolean;
  onDecisions: (d: DayDecisions | ((p: DayDecisions) => DayDecisions)) => void;
  onPlanPower: () => void;
  onReadyForEvent: () => void;
  onChoose: (c: "A" | "B") => void;
  onContinueAfterResult: () => void;
  onOpenGlossary: () => void;
};

/**
 * Full-canvas 2D adventure. Created once per mission; stays mounted Day 1→end.
 */
export function PhaserPlay({
  state,
  decisions,
  powerToday,
  mode,
  event,
  deltas,
  stormAlerts,
  tomorrowHint,
  visible,
  onDecisions,
  onPlanPower,
  onReadyForEvent,
  onChoose,
  onContinueAfterResult,
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
    deltas,
    stormAlerts,
    tomorrowHint,
    onDecisions,
    onPlanPower,
    onReadyForEvent,
    onChoose,
    onContinueAfterResult,
    onOpenGlossary,
  });
  latest.current = {
    state,
    decisions,
    powerToday,
    mode,
    event,
    deltas,
    stormAlerts,
    tomorrowHint,
    onDecisions,
    onPlanPower,
    onReadyForEvent,
    onChoose,
    onContinueAfterResult,
    onOpenGlossary,
  };

  useEffect(() => {
    const wire = () => {
      moonBridgeRef.current = {
        getDay: () => latest.current.state.day,
        getMode: () => latest.current.mode,
        getDecisions: () => latest.current.decisions,
        getPowerToday: () => latest.current.powerToday,
        getPowerSpent: () => plannedPowerCost(latest.current.decisions),
        getState: () => latest.current.state,
        getEvent: () => latest.current.event,
        getHint: () => "Every ON helps and costs.",
        getDeltas: () => latest.current.deltas,
        getStormAlerts: () => latest.current.stormAlerts,
        getTomorrowHint: () => latest.current.tomorrowHint,
        ready: () => true,
        patchDecisions: (patch) =>
          latest.current.onDecisions({
            ...latest.current.decisions,
            ...patch,
          }),
        setDecisions: (d) => latest.current.onDecisions(d),
        goPowerCheck: () => latest.current.onPlanPower(),
        goChoice: () => latest.current.onReadyForEvent(),
        choose: (c) => latest.current.onChoose(c),
        continueAfterResult: () => latest.current.onContinueAfterResult(),
        openGlossary: () => latest.current.onOpenGlossary(),
      };
    };

    wire();
    if (!hostRef.current || gameRef.current) return;
    gameRef.current = createMoonGame(hostRef.current);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      moonBridgeRef.current = null;
    };
  }, []);

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
      getDeltas: () => latest.current.deltas,
      getStormAlerts: () => latest.current.stormAlerts,
      getTomorrowHint: () => latest.current.tomorrowHint,
      ready: () => true,
      continueAfterResult: () => latest.current.onContinueAfterResult(),
      choose: (c) => latest.current.onChoose(c),
      goChoice: () => latest.current.onReadyForEvent(),
      goPowerCheck: () => latest.current.onPlanPower(),
    };
  }, [mode, decisions, event, powerToday, state, deltas, stormAlerts, tomorrowHint]);

  return (
    <section
      className={`phaser-play phaser-play--fullscreen${visible ? "" : " phaser-play--hidden"}`}
      aria-hidden={!visible}
    >
      <div className="phaser-play__canvas" ref={hostRef} />
      {visible ? (
        <p className="phaser-play__hint">
          Move with arrows · click buildings · <strong>Plan day</strong> for
          trade-offs
        </p>
      ) : null}
    </section>
  );
}
