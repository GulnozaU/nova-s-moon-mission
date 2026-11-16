import { useEffect, useRef } from "react";
import type { DayDecisions } from "../engine/types";
import type { Event, GameState } from "../types";
import type { SpaceWeatherResult } from "../data/donkiTypes";
import type { OsdrStudy } from "../data/osdrTypes";
import type { StormAlert } from "../content/schedule";
import { plannedPowerCost } from "../ui/powerMath";
import { listArchivedOsdrStudies } from "../data/osdr";
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
  osdrStudy: OsdrStudy | null;
  visible: boolean;
  onDecisions: (d: DayDecisions | ((p: DayDecisions) => DayDecisions)) => void;
  onNovaLine: (line: string) => void;
  onSheltering: (on: boolean) => void;
  onEndDay: () => BridgeDelta[];
  onContinueAfterResult: () => void;
  onOpenGlossary: () => void;
};

function stormBrief(event: Event | null, alerts: StormAlert[]): string {
  if (event?.stormSeverity !== undefined) {
    const date = event.eventDate?.slice(0, 10) ?? "NASA date";
    return `Storm day · NASA saw this on ${date}. Shelter cuts risk; science walks outside add risk.`;
  }
  if (alerts.length > 0) {
    const a = alerts[0]!;
    const date = a.eventDate?.slice(0, 10);
    return `${a.message}${date ? ` · flare date ${date}` : ""} · warning window ~${a.warningDays} day(s).`;
  }
  return "No storm warning yet. Power the radio so Mission Control can call ahead.";
}

function preferOsdr476(study: OsdrStudy | null): OsdrStudy | null {
  if (study?.id === "OSD-476") return study;
  const archived = listArchivedOsdrStudies().find((s) => s.id === "OSD-476");
  return archived ?? study;
}

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
  osdrStudy,
  visible,
  onDecisions,
  onNovaLine,
  onSheltering,
  onEndDay,
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
    commsYesterday,
    novaLine,
    sheltering,
    osdrStudy,
    onDecisions,
    onNovaLine,
    onSheltering,
    onEndDay,
    onContinueAfterResult,
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
      osdrStudy,
      onDecisions,
      onNovaLine,
      onSheltering,
      onEndDay,
      onContinueAfterResult,
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
        getHint: () => "Drag chips onto machines. Drag Nova into bed to end the day.",
        getDeltas: () => latest.current.deltas,
        getStormAlerts: () => latest.current.stormAlerts,
        getTomorrowHint: () => latest.current.tomorrowHint,
        getCommsYesterday: () => latest.current.commsYesterday,
        getNovaLine: () => latest.current.novaLine,
        getOsdrStudy: () => preferOsdr476(latest.current.osdrStudy),
        getStormBrief: () =>
          stormBrief(latest.current.event, latest.current.stormAlerts),
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
      getCommsYesterday: () => latest.current.commsYesterday,
      getNovaLine: () => latest.current.novaLine,
      getSheltering: () => latest.current.sheltering,
      getOsdrStudy: () => preferOsdr476(latest.current.osdrStudy),
      getStormBrief: () =>
        stormBrief(latest.current.event, latest.current.stormAlerts),
      ready: () => true,
      endDay: () => latest.current.onEndDay(),
      continueAfterResult: () => latest.current.onContinueAfterResult(),
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
    osdrStudy,
  ]);

  return (
    <section
      className={`phaser-play phaser-play--fullscreen${visible ? "" : " phaser-play--hidden"}`}
      aria-hidden={!visible}
    >
      <div className="phaser-play__canvas" ref={hostRef} />
    </section>
  );
}
