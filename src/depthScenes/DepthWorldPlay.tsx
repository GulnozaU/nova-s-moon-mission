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
import { getNasaImage } from "../content/images";
import { DepthPlaceScene } from "./DepthPlaceScene";
import { getFloor } from "./places";
import { PLACE_LABELS, type PlaceId } from "./types";
import { uvToWorld } from "./math";
import { InteractiveLayer } from "./interactives/InteractiveLayer";
import { defaultPlaceFx } from "./interactives/actions";
import type { DragPayload, PlaceFx } from "./interactives/types";
import "../world3d/hud/WorldHud.css";
import "./interactives/depthInteract.css";

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
 * Persistent four-place depth-painting world with interactive objects.
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
  const [navigateTo, setNavigateTo] = useState<PlaceId | null>(null);
  const hudDestRef = useRef<PlaceId | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const walkApiRef = useRef<WalkApi | null>(
    null,
  ) as MutableRefObject<WalkApi | null>;
  const novaPosRef = useRef(new THREE.Vector3()) as MutableRefObject<THREE.Vector3>;
  const floor = getFloor(place);

  const [fx, setFxState] = useState<PlaceFx>(defaultPlaceFx);
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [infoCard, setInfoCard] = useState<{
    text: string;
    badge?: string;
    storm?: boolean;
  } | null>(null);
  const endingRef = useRef(false);

  const setFx = useCallback(
    (patch: Partial<PlaceFx> | ((p: PlaceFx) => PlaceFx)) => {
      setFxState((prev) =>
        typeof patch === "function" ? patch(prev) : { ...prev, ...patch },
      );
    },
    [],
  );

  const dpr = useMemo(() => {
    if (typeof window === "undefined") return 1;
    return Math.min(window.devicePixelRatio || 1, 2);
  }, []);

  // Wilt plants that were watered but never lit after a while (visual only).
  useEffect(() => {
    if (place !== "greenhouse") return;
    if (decisions.greenhouse || fx.growLightOn) return;
    const t = window.setTimeout(() => {
      setFx((prev) => ({
        ...prev,
        plantWilt: prev.plantStage.map((s) => s > 0 && s < 3) as PlaceFx["plantWilt"],
      }));
    }, 12000);
    return () => window.clearTimeout(t);
  }, [place, decisions.greenhouse, fx.growLightOn, fx.plantStage, setFx]);

  // Rover returns after trip animation window.
  useEffect(() => {
    if (!fx.roverTrip) return;
    const t = window.setTimeout(() => {
      setFx({ roverTrip: false });
      onNovaLine("Rover is back with samples for the lab.");
      audio.play("success");
    }, prefersReducedMotion() ? 400 : 2800);
    return () => window.clearTimeout(t);
  }, [fx.roverTrip, setFx, onNovaLine]);

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
        "Hover objects · drag chips/water/crates · walk up to USE · bed ends day",
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

  const patchDecisions = useCallback(
    (patch: Partial<DayDecisions>) => {
      onDecisions({ ...decisions, ...patch });
    },
    [decisions, onDecisions],
  );

  const finishDay = useCallback(() => {
    if (endingRef.current) return;
    endingRef.current = true;
    audio.play("dayEnd");
    onEndDay();
    window.setTimeout(() => {
      onContinueAfterResult();
      endingRef.current = false;
      setFx(defaultPlaceFx());
      setDrag(null);
      setPlace("surface");
    }, 600);
  }, [onEndDay, onContinueAfterResult, setFx]);

  const showInfo = useCallback((text: string, badge?: string) => {
    const storm = /storm|flare|CME|Sun/i.test(text);
    setInfoCard({ text, badge, storm });
  }, []);

  const spent = plannedPowerCost(decisions);
  const free = Math.max(0, powerToday - spent);
  const stormImg = useMemo(() => getNasaImage("storm"), []);
  const warningLine =
    stormAlerts[0] != null
      ? `Warning: about ${stormAlerts[0].warningDays} day(s). ${stormAlerts[0].message}`
      : event?.eventDate
        ? `NASA date ${event.eventDate.slice(0, 10)}.`
        : "No CME warning clock yet — power the radio.";

  const hold = (kind: DragPayload["kind"], amount: number, label: string) => {
    if (drag?.kind === kind) {
      setDrag(null);
      audio.play("uiClick");
      return;
    }
    setDrag({ kind, amount });
    audio.play("pick");
    onNovaLine(`Holding ${label}. Tap a glowing drop target.`);
  };

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
            novaPosRef={novaPosRef}
            interactives={
              <InteractiveLayer
                place={place}
                floor={floor}
                decisions={decisions}
                state={state}
                powerToday={powerToday}
                fx={fx}
                setFx={setFx}
                drag={drag}
                setDrag={setDrag}
                novaPosRef={novaPosRef}
                onDecisions={patchDecisions}
                onNovaLine={onNovaLine}
                onInfo={showInfo}
                onGoPlace={enterPlace}
                onEndDay={finishDay}
              />
            }
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
              <button
                key={i}
                type="button"
                className={`world3d-chip${i < free ? " is-free" : ""}${
                  drag?.kind === "chip" && i < free ? " is-held" : ""
                }`}
                style={{
                  border: "none",
                  padding: 0,
                  cursor: i < free ? "grab" : "default",
                }}
                disabled={i >= free}
                aria-label={i < free ? "Drag power chip" : "Spent chip"}
                onClick={() => {
                  if (i < free) hold("chip", 1, "a power chip");
                }}
              />
            ))}
          </div>
          <p className="world3d-chips__meta">
            Science {state.science}/{SCIENCE_SUCCESS_TARGET} · 💧{state.water} ·
            O₂{state.oxygen} · 🛡️{state.shieldLevel}
            {fx.waterHeld ? ` · drops ${fx.waterHeld}` : ""}
            {fx.samplesHeld || fx.roverSamples
              ? ` · samples ${fx.samplesHeld + fx.roverSamples}`
              : ""}
            {fx.materialsHeld ? ` · crates ${fx.materialsHeld}` : ""}
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

        <div className="depth-tools" aria-label="Carry items">
          <button
            type="button"
            className={drag?.kind === "water" ? "is-held" : ""}
            onClick={() => hold("water", 1, "water drops")}
          >
            💧 Water {fx.waterHeld ? `(${fx.waterHeld})` : ""}
          </button>
          <button
            type="button"
            className={drag?.kind === "crate" ? "is-held" : ""}
            onClick={() => {
              if (fx.materialsHeld < 2) {
                onNovaLine("Tap supply crates on the surface first.");
                audio.play("uiClick");
                return;
              }
              hold("crate", 2, "supply crates");
            }}
          >
            📦 Crates
          </button>
          <button
            type="button"
            className={drag?.kind === "sample" ? "is-held" : ""}
            onClick={() => {
              if (fx.samplesHeld + fx.roverSamples < 1) {
                onNovaLine("Get samples from the rover or lab rack.");
                return;
              }
              hold("sample", 1, "a sample");
            }}
          >
            🪨 Sample
          </button>
          <button
            type="button"
            className={drag?.kind === "nova" ? "is-held" : ""}
            onClick={() => hold("nova", 1, "Nova")}
          >
            🧑‍🚀 Nova
          </button>
          <button
            type="button"
            className={drag?.kind === "crew" ? "is-held" : ""}
            onClick={() => hold("crew", 1, "a crew member")}
          >
            👥 Crew
          </button>
        </div>

        {infoCard ? (
          <aside className="depth-info-card" role="dialog" aria-label="NASA info">
            {infoCard.badge ? (
              <span className="depth-info-card__badge">{infoCard.badge}</span>
            ) : null}
            {infoCard.storm ? (
              <>
                <img
                  className="depth-storm-pic"
                  src={stormImg.file}
                  alt={stormImg.alt}
                />
                <p className="depth-info-card__badge">LIVE / ARCHIVED</p>
                <p>{warningLine}</p>
              </>
            ) : null}
            <p>{infoCard.text}</p>
            <button type="button" onClick={() => setInfoCard(null)}>
              Close
            </button>
          </aside>
        ) : null}

        {novaLine ? <p className="world3d-nova">{novaLine}</p> : null}

        <p className="world3d-hint">
          Hover for cost/benefit · drag chips onto machines · walk+tap USE ·
          bunk ends day
        </p>
      </div>
    </section>
  );
}
