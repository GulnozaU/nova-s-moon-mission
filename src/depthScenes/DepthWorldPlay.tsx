import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
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
import { prefersReducedMotion } from "../world3d/reducedMotion";
import { DepthPlaceScene } from "./DepthPlaceScene";
import { getFloor } from "./places";
import { PLACE_LABELS, type PlaceId } from "./types";
import { uvToWorld } from "./math";
import "../world3d/hud/WorldHud.css";

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

type WalkApi = {
  setTarget: (p: THREE.Vector3 | null) => void;
  getPosition: () => THREE.Vector3;
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

const PLACES: PlaceId[] = ["surface", "home", "greenhouse", "lab"];

/**
 * Persistent four-place depth-painting world.
 * Phaser 2D remains on `?mode=2d`.
 */
export function DepthWorldPlay(props: Props) {
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

  const [place, setPlace] = useState<PlaceId>("surface");
  const [fading, setFading] = useState(false);
  const [fadeOn, setFadeOn] = useState(false);
  /** Active auto-walk target (door toward this place). */
  const [navigateTo, setNavigateTo] = useState<PlaceId | null>(null);
  /** Final HUD destination across multi-hop (e.g. home → surface → lab). */
  const hudDestRef = useRef<PlaceId | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const walkApiRef = useRef<WalkApi | null>(
    null,
  ) as MutableRefObject<WalkApi | null>;
  const floor = getFloor(place);

  const dpr = useMemo(() => {
    if (typeof window === "undefined") return 1;
    return Math.min(window.devicePixelRatio || 1, 2);
  }, []);

  useEffect(() => {
    moonBridgeRef.current = {
      getDay: () => state.day,
      getMode: () => mode,
      getDecisions: () => decisions,
      getPowerToday: () => powerToday,
      getPowerSpent: () => plannedPowerCost(decisions),
      getState: () => state,
      getEvent: () => event,
      getHint: () =>
        "WASD or tap the floor. Walk through gold doors. Place icons auto-walk.",
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

  const enterPlace = useCallback(
    (next: PlaceId) => {
      if (next === place || fading) return;
      setFading(true);
      setFadeOn(true);
      audio.play("door");
      const ms = prefersReducedMotion() ? 80 : 400;
      window.setTimeout(() => {
        setPlace(next);
        const dest = hudDestRef.current;
        if (dest && dest === next) {
          hudDestRef.current = null;
          setNavigateTo(null);
        } else if (dest && dest !== next) {
          setNavigateTo(dest);
        } else {
          setNavigateTo(null);
        }
        setFadeOn(false);
        window.setTimeout(() => setFading(false), ms);
      }, ms);
    },
    [place, fading],
  );

  /** HUD: auto-walk toward door; multi-hop via surface when needed. */
  const requestPlace = useCallback(
    (next: PlaceId) => {
      if (next === place || fading) return;
      hudDestRef.current = next;
      setNavigateTo(next);
      const door =
        floor.doors.find((d) => d.to === next) ??
        floor.doors.find((d) => d.to === "surface") ??
        floor.doors[0];
      if (door && walkApiRef.current) {
        const [ww, dd] = floor.worldSize;
        walkApiRef.current.setTarget(uvToWorld(door.uv, ww, dd));
      }
    },
    [place, fading, floor],
  );

  const spent = plannedPowerCost(decisions);
  const free = Math.max(0, powerToday - spent);

  if (!visible) return null;

  return (
    <section
      className="world3d-root world3d-root--fullscreen"
      aria-label="Moon mission depth world"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPointer({
          x: ((e.clientX - r.left) / r.width) * 2 - 1,
          y: ((e.clientY - r.top) / r.height) * 2 - 1,
        });
      }}
    >
      <Canvas
        className="world3d-canvas"
        dpr={dpr}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 36, near: 0.1, far: 50, position: [0, 1.35, 8.8] }}
        onCreated={({ gl }) => {
          gl.setClearColor("#f3ebe0");
        }}
      >
        <Suspense fallback={null}>
          <DepthPlaceScene
            key={place}
            floor={floor}
            pointer={pointer}
            fading={fading}
            navigateTo={navigateTo}
            onReachedDoor={enterPlace}
            walkApiRef={walkApiRef}
          />
        </Suspense>
      </Canvas>

      <div
        className={`world3d-fade${fadeOn ? " is-on" : ""}`}
        aria-hidden
        style={
          prefersReducedMotion()
            ? { transitionDuration: "0.08s" }
            : undefined
        }
      />

      <div className="world3d-hud" data-hud>
        <div className="world3d-chips" data-chip-tray>
          <p className="world3d-chips__title">
            Day {state.day}/10 · {free} free chips · {PLACE_LABELS[place]}
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
          {PLACES.map((id) => (
            <button
              key={id}
              type="button"
              className={place === id ? "is-here" : ""}
              onClick={() => requestPlace(id)}
            >
              {PLACE_LABELS[id]}
            </button>
          ))}
        </nav>

        {novaLine ? <p className="world3d-nova">{novaLine}</p> : null}

        <p className="world3d-hint">
          WASD / arrows or tap floor · gold doors · HUD auto-walks · ?mode=2d
          old game
        </p>
      </div>
    </section>
  );
}
