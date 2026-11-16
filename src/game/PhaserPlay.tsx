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
  commsYesterday: boolean;
  novaLine: string;
  sheltering: boolean;
  visible: boolean;
  onDecisions: (d: DayDecisions | ((p: DayDecisions) => DayDecisions)) => void;
  onNovaLine: (line: string) => void;
  onSheltering: (on: boolean) => void;
  onEndDay: () => BridgeDelta[];
  onOpenGlossary: () => void;
};

/**
 * Full-canvas day loop. Created once per mission; stays mounted Day 1→end.
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
  commsYesterday,
  novaLine,
  sheltering,
  visible,
  onDecisions,
  onNovaLine,
  onSheltering,
  onEndDay,
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
    commsYesterday,
    novaLine,
    sheltering,
    onDecisions,
    onNovaLine,
    onSheltering,
    onEndDay,
    onOpenGlossary,
  });

  useEffect(() => {
    latest.current = {
      state,
      decisions,
      powerToday,
      mode,
      event,
      deltas,
      stormAlerts,
      tomorrowHint,
      commsYesterday,
      novaLine,
      sheltering,
      onDecisions,
      onNovaLine,
      onSheltering,
      onEndDay,
      onOpenGlossary,
    };
  });

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
        getHint: () => "Stand still on a glowing circle. Bed ends the day.",
        getDeltas: () => latest.current.deltas,
        getStormAlerts: () => latest.current.stormAlerts,
        getTomorrowHint: () => latest.current.tomorrowHint,
        getCommsYesterday: () => latest.current.commsYesterday,
        getNovaLine: () => latest.current.novaLine,
        ready: () => true,
        patchDecisions: (patch) =>
          latest.current.onDecisions({
            ...latest.current.decisions,
            ...patch,
          }),
        setDecisions: (d) => latest.current.onDecisions(d),
        setNovaLine: (line) => latest.current.onNovaLine(line),
        setSheltering: (on) => latest.current.onSheltering(on),
        getSheltering: () => latest.current.sheltering,
        endDay: () => latest.current.onEndDay(),
        goPowerCheck: () => undefined,
        goChoice: () => undefined,
        choose: () => undefined,
        continueAfterResult: () => undefined,
        openGlossary: () => latest.current.onOpenGlossary(),
      };
    };
    // onEndDay returns deltas for in-world floaters.

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
      getCommsYesterday: () => latest.current.commsYesterday,
      getNovaLine: () => latest.current.novaLine,
      getSheltering: () => latest.current.sheltering,
      ready: () => true,
      endDay: () => latest.current.onEndDay(),
      setNovaLine: (line) => latest.current.onNovaLine(line),
      setSheltering: (on) => latest.current.onSheltering(on),
    };
  }, [
    mode,
    decisions,
    event,
    powerToday,
    state,
    deltas,
    stormAlerts,
    tomorrowHint,
    commsYesterday,
    novaLine,
    sheltering,
  ]);

  return (
    <section
      className={`phaser-play phaser-play--fullscreen${visible ? "" : " phaser-play--hidden"}`}
      aria-hidden={!visible}
    >
      <div className="phaser-play__canvas" ref={hostRef} />
      {visible ? (
        <p className="phaser-play__hint">
          Arrows / WASD or tap to walk · stand still on a circle · bed ends the day
        </p>
      ) : null}
    </section>
  );
}
