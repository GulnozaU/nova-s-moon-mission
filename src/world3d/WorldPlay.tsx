import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { DayDecisions } from "../engine/types";
import type { Event, GameState } from "../types";
import type { SpaceWeatherResult } from "../data/donkiTypes";
import type { OsdrStudy } from "../data/osdrTypes";
import type { StormAlert } from "../content/schedule";
import { plannedPowerCost } from "../ui/powerMath";
import { SCIENCE_SUCCESS_TARGET } from "../engine/constants";
import { moonBridgeRef, type BridgeDelta, type PlayMode } from "../game/bridge";
import { listArchivedOsdrStudies } from "../data/osdr";
import { audio } from "../audio/audio";
import { WorldScene } from "./WorldScene";
import type { PlaceId3d } from "./palette";
import { prefersReducedMotion } from "./reducedMotion";
import "./hud/WorldHud.css";

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

function preferOsdr476(study: OsdrStudy | null): OsdrStudy | null {
  if (study?.id === "OSD-476") return study;
  return listArchivedOsdrStudies().find((s) => s.id === "OSD-476") ?? study;
}

function stormBrief(event: Event | null, alerts: StormAlert[]): string {
  if (event?.stormSeverity !== undefined) {
    const date = event.eventDate?.slice(0, 10) ?? "NASA date";
    return `Storm day · NASA saw this on ${date}. Shelter the crew.`;
  }
  if (alerts.length > 0) {
    const a = alerts[0]!;
    return `${a.message} · warning ~${a.warningDays} day(s).`;
  }
  return "No storm warning yet. Chip the radio so Mission Control can call.";
}

/**
 * 3D day loop (R3F). DOM overlays for crisp HUD text.
 * Phaser 2D remains available via ?mode=2d.
 */
export function WorldPlay(props: Props) {
  const {
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
  } = props;

  const [place, setPlace] = useState<PlaceId3d>("surface");
  const [fading, setFading] = useState(false);
  const [fadeOn, setFadeOn] = useState(false);

  const dpr = useMemo(() => {
    if (typeof window === "undefined") return 1;
    return Math.min(window.devicePixelRatio || 1, 2);
  }, []);

  // Bridge for shared engine session (same as Phaser path).
  useEffect(() => {
    moonBridgeRef.current = {
      getDay: () => state.day,
      getMode: () => mode,
      getDecisions: () => decisions,
      getPowerToday: () => powerToday,
      getPowerSpent: () => plannedPowerCost(decisions),
      getState: () => state,
      getEvent: () => event,
      getHint: () => "WASD or tap to walk. Walk through doors.",
      getDeltas: () => deltas,
      getStormAlerts: () => stormAlerts,
      getTomorrowHint: () => tomorrowHint,
      getCommsYesterday: () => commsYesterday,
      getNovaLine: () => novaLine,
      getOsdrStudy: () => preferOsdr476(osdrStudy),
      getStormBrief: () => stormBrief(event, stormAlerts),
      ready: () => true,
      patchDecisions: (patch) => onDecisions({ ...decisions, ...patch }),
      setDecisions: onDecisions,
      setNovaLine: onNovaLine,
      setSheltering: onSheltering,
      getSheltering: () => sheltering,
      endDay: onEndDay,
      goPowerCheck: () => undefined,
      goChoice: () => undefined,
      choose: () => undefined,
      continueAfterResult: onContinueAfterResult,
      openGlossary: onOpenGlossary,
    };
    return () => {
      moonBridgeRef.current = null;
    };
  });

  const goPlace = useCallback(
    (next: PlaceId3d) => {
      if (next === place || fading) return;
      setFading(true);
      setFadeOn(true);
      audio.play("door");
      const ms = prefersReducedMotion() ? 80 : 400;
      window.setTimeout(() => {
        setPlace(next);
        setFadeOn(false);
        window.setTimeout(() => setFading(false), ms);
      }, ms);
    },
    [place, fading],
  );

  const spent = plannedPowerCost(decisions);
  const free = Math.max(0, powerToday - spent);

  if (!visible) return null;

  return (
    <section
      className="world3d-root world3d-root--fullscreen"
      aria-label="Moon mission 3D world"
    >
      <Canvas
        className="world3d-canvas"
        shadows
        dpr={dpr}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 42, near: 0.1, far: 120, position: [10, 12, 10] }}
        onCreated={({ gl }) => {
          gl.setClearColor("#c8d8e8");
        }}
      >
        <Suspense fallback={null}>
          <WorldScene place={place} onPlaceChange={goPlace} fading={fading} />
        </Suspense>
      </Canvas>

      <div className={`world3d-fade${fadeOn ? " is-on" : ""}`} aria-hidden />

      <div className="world3d-hud" data-hud>
        <div className="world3d-chips">
          <p className="world3d-chips__title">
            Day {state.day}/10 · {free} free chips
          </p>
          <div className="world3d-chips__row">
            {Array.from({ length: Math.min(powerToday, 20) }, (_, i) => (
              <span
                key={i}
                className={`world3d-chip${i < free ? " is-free" : ""}`}
              />
            ))}
          </div>
          <p className="world3d-chips__meta">
            Science {state.science}/{SCIENCE_SUCCESS_TARGET} · 💧{state.water} ·
            O₂{state.oxygen}
          </p>
        </div>

        <nav className="world3d-places" aria-label="Places">
          {(
            [
              ["surface", "Surface"],
              ["home", "Home"],
              ["greenhouse", "Plants"],
              ["lab", "Lab"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={place === id ? "is-here" : ""}
              onClick={() => goPlace(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {novaLine ? <p className="world3d-nova">{novaLine}</p> : null}

        <p className="world3d-hint">
          WASD / arrows or tap ground · walk through yellow doors · ?mode=2d for
          old game
        </p>
      </div>
    </section>
  );
}
