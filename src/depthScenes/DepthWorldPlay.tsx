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
import { BATTERY_CAP, SCIENCE_SUCCESS_TARGET } from "../engine/constants";
import { moonBridgeRef, type BridgeDelta, type PlayMode } from "../game/bridge";
import { listArchivedOsdrStudies } from "../data/osdr";
import { audio } from "../audio/audio";
import { prefersReducedMotion } from "../world3d/reducedMotion";
import { getNasaImage } from "../content/images";
import { clipWords } from "../game/novaTalk";
import { DepthPlaceScene } from "./DepthPlaceScene";
import { getFloor } from "./places";
import { PLACE_LABELS, type PlaceId } from "./types";
import { uvToWorld } from "./math";
import { InteractiveLayer } from "./interactives/InteractiveLayer";
import { defaultPlaceFx, freePower } from "./interactives/actions";
import type { CrewId, DragPayload, PlaceFx } from "./interactives/types";
import { ConsequenceScene } from "./ConsequenceScene";
import { MorningBriefing } from "./MorningBriefing";
import { StormAnnounce } from "./StormAnnounce";
import { PLAIN_LIT_DAYS } from "../engine/constants";
import "../world3d/hud/WorldHud.css";
import "./interactives/depthInteract.css";

const CREW: { id: CrewId; name: string }[] = [
  { id: "sam", name: "Sam" },
  { id: "mira", name: "Mira" },
  { id: "ana", name: "Ana" },
];

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
    return `Storm day. NASA saw this on ${date}. Shelter the crew.`;
  }
  if (alerts.length > 0) {
    const a = alerts[0]!;
    return `${a.message} About ${a.warningDays} day(s) of warning.`;
  }
  return "No storm warning yet. Chip the radio so Mission Control can call.";
}

const PLACES: PlaceId[] = ["surface", "home", "greenhouse", "lab"];

/**
 * Persistent four-place depth-painting world with interactive objects.
 * Default play is Phaser soft-pixel 2D. Depth world only via `?mode=depth`.
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
  const [consequence, setConsequence] = useState<BridgeDelta[] | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [stormPulse, setStormPulse] = useState(0);
  const endingRef = useRef(false);
  const stormToday = event?.stormSeverity !== undefined;
  const warningComing = !stormToday && stormAlerts.length > 0 && commsYesterday;
  const isNight =
    state.site === "plain" && state.day > PLAIN_LIT_DAYS && !stormToday;

  useEffect(() => {
    if (!stormToday) {
      setStormPulse(0);
      return;
    }
    const id = window.setInterval(() => {
      setStormPulse(1);
      window.setTimeout(() => setStormPulse(0), 400);
    }, prefersReducedMotion() ? 9000 : 5200);
    return () => window.clearInterval(id);
  }, [stormToday]);

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

  useEffect(() => {
    if (!drag) setGhost(null);
  }, [drag]);

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
        "Hover objects. Drag chips onto jobs. Walk up to use. Bed ends the day.",
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
    if (endingRef.current || consequence) return;
    endingRef.current = true;
    audio.play("dayEnd");
    const nextDeltas = onEndDay();
    setConsequence(nextDeltas);
    setDrag(null);
    setGhost(null);
  }, [onEndDay, consequence]);

  const afterConsequence = useCallback(() => {
    setConsequence(null);
    onContinueAfterResult();
    endingRef.current = false;
    setFx(defaultPlaceFx());
    setDrag(null);
    setPlace("surface");
  }, [onContinueAfterResult, setFx]);

  const showInfo = useCallback((text: string, badge?: string) => {
    const storm = /storm|flare|CME|Sun/i.test(text);
    setInfoCard({ text, badge, storm });
  }, []);

  const spent = plannedPowerCost(decisions);
  const free = freePower(decisions, powerToday, fx.fills);
  const stormImg = useMemo(() => getNasaImage("storm"), []);
  const warningLine =
    stormAlerts[0] != null
      ? `Warning: about ${stormAlerts[0].warningDays} day(s). ${stormAlerts[0].message}`
      : event?.eventDate
        ? `NASA date ${event.eventDate.slice(0, 10)}.`
        : "No CME warning clock yet — power the radio.";

  const hold = (
    kind: DragPayload["kind"],
    amount: number,
    label: string,
    crewId?: CrewId,
  ) => {
    if (drag?.kind === kind && drag.crewId === crewId) {
      setDrag(null);
      setGhost(null);
      audio.play("uiClick");
      return;
    }
    setDrag({ kind, amount, crewId });
    audio.play("pick");
    onNovaLine(
      clipWords(`Holding ${label}. Drop on a green target.`),
    );
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
        if (drag) setGhost({ x: e.clientX, y: e.clientY });
      }}
      onPointerUp={() => {
        /* drop resolves on hotspot pointerUp */
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
            isNight={isNight}
            stormToday={stormToday}
            stormPulse={stormPulse}
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

      <StormAnnounce
        stormToday={stormToday}
        warningComing={warningComing}
        daysUntil={stormAlerts[0]?.daysUntil}
      />

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
            Day {state.day}/10 · {free} free · bat {state.battery}/{BATTERY_CAP} ·{" "}
            {PLACE_LABELS[place]}
          </p>
          <div className="world3d-chips__row" data-chip-tray-drag>
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
                onPointerDown={(e) => {
                  if (i >= free) return;
                  e.preventDefault();
                  hold("chip", 1, "a power chip");
                  setGhost({ x: e.clientX, y: e.clientY });
                }}
              />
            ))}
          </div>
          <p className="world3d-chips__meta">
            🔬{state.science}/{SCIENCE_SUCCESS_TARGET} · 💧{state.water} · O₂
            {state.oxygen} · ⚠{Math.round(state.exposure)} · 🛡️
            {state.shieldLevel}
            {spent ? ` · plan −${spent}` : ""}
            {fx.waterHeld ? ` · drops ${fx.waterHeld}` : ""}
            {fx.samplesHeld || fx.roverSamples
              ? ` · samples ${fx.samplesHeld + fx.roverSamples}`
              : ""}
            {fx.materialsHeld ? ` · crates ${fx.materialsHeld}` : ""}
          </p>
          {commsYesterday && stormAlerts.length > 0 ? (
            <p className="world3d-chips__meta">
              {clipWords(stormAlerts[0]!.message)}
            </p>
          ) : null}
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
            onPointerDown={(e) => {
              e.preventDefault();
              hold("water", 1, "water drops");
              setGhost({ x: e.clientX, y: e.clientY });
            }}
          >
            💧 Water {fx.waterHeld ? `(${fx.waterHeld})` : ""}
          </button>
          <button
            type="button"
            className={drag?.kind === "crate" ? "is-held" : ""}
            onPointerDown={(e) => {
              e.preventDefault();
              if (fx.materialsHeld < 2) {
                onNovaLine("Tap supply crates on the surface first.");
                audio.play("uiClick");
                return;
              }
              hold("crate", 2, "supply crates");
              setGhost({ x: e.clientX, y: e.clientY });
            }}
          >
            📦 Crates
          </button>
          <button
            type="button"
            className={drag?.kind === "sample" ? "is-held" : ""}
            onPointerDown={(e) => {
              e.preventDefault();
              if (fx.samplesHeld + fx.roverSamples < 1) {
                onNovaLine("Get samples from the rover or lab rack.");
                return;
              }
              hold("sample", 1, "a sample");
              setGhost({ x: e.clientX, y: e.clientY });
            }}
          >
            🪨 Sample
          </button>
          <button
            type="button"
            className={drag?.kind === "nova" ? "is-held" : ""}
            onPointerDown={(e) => {
              e.preventDefault();
              hold("nova", 1, "Nova");
              setGhost({ x: e.clientX, y: e.clientY });
            }}
          >
            🧑‍🚀 Nova
          </button>
        </div>

        {stormToday ? (
          <div className="depth-storm-crew" aria-label="Shelter crew">
            <p className="depth-storm-crew__title">
              Storm! Drag crew into Home
            </p>
            <div className="depth-storm-crew__row">
              {CREW.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${fx.sheltered[c.id] ? "is-in" : ""}${
                    drag?.crewId === c.id ? " is-held" : ""
                  }`}
                  disabled={fx.sheltered[c.id]}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (fx.sheltered[c.id]) return;
                    hold("crew", 1, c.name, c.id);
                    setGhost({ x: e.clientX, y: e.clientY });
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!consequence ? (
          <MorningBriefing
            state={state}
            event={event}
            alerts={stormAlerts}
            commsYesterday={commsYesterday}
            dayKey={state.day}
            onPatch={patchDecisions}
            onNovaLine={onNovaLine}
          />
        ) : null}

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
          Drag chips onto green targets. Fill machines fully. Bed ends the day.
        </p>
      </div>

      {ghost && drag ? (
        <div
          className="depth-drag-ghost"
          style={{ left: ghost.x, top: ghost.y }}
          aria-hidden
        />
      ) : null}

      {consequence ? (
        <ConsequenceScene deltas={consequence} onContinue={afterConsequence} />
      ) : null}
    </section>
  );
}
