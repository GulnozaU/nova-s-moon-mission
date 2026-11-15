import { useEffect, useRef, useState } from "react";
import type { DayDecisions } from "../engine/types";
import type { Event, GameState } from "../types";
import type { SpaceWeatherResult } from "../data/donkiTypes";
import { LOSE_EXPOSURE_AT } from "../engine/constants";
import { plainTalk } from "../content/banned";
import { nasaImageForContext, nasaImageForDay } from "../content/imageForContext";
import { CardNasaImage } from "../ui/CardNasaImage";
import { SourceBadge } from "../ui/SourceBadge";
import { DecisionTeachCard } from "../ui/teach/DecisionTeachCard";
import { PowerTradePanel } from "../ui/teach/PowerTradePanel";
import { SpaceText } from "../ui/teach/SpaceText";
import { isDaylight, sunBarLabel } from "../ui/teach/dayNight";
import { plannedPowerCost } from "../ui/powerMath";
import { moonBridgeRef, type PlayMode } from "./bridge";
import { createMoonGame } from "./createMoonGame";
import { jobRows } from "./jobsHud";
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
 * Day loop centered on teaching trade-offs (challenge goal).
 * Phaser world shows consequences; PowerTradePanel / DecisionTeachCard teach choices.
 */
export function PhaserPlay({
  state,
  weather,
  event,
  decisions,
  powerToday,
  mode,
  onDecisions,
  onPlanPower,
  onReadyForEvent,
  onChoose,
  onOpenGlossary,
}: Props) {
  const [showBase, setShowBase] = useState(false);
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
      getHint: () =>
        latest.current.mode === "choose"
          ? "Pick A or B — each helps and costs something different."
          : "You cannot turn everything on. That is the trade-off.",
      patchDecisions: (patch) =>
        latest.current.onDecisions({ ...latest.current.decisions, ...patch }),
      setDecisions: (d) => latest.current.onDecisions(d),
      goPowerCheck: () => latest.current.onPlanPower(),
      goChoice: () => latest.current.onReadyForEvent(),
      choose: (c) => latest.current.onChoose(c),
      openGlossary: () => latest.current.onOpenGlossary(),
    };
  });

  useEffect(() => {
    if (!showBase) {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      return;
    }
    if (!hostRef.current || gameRef.current) return;
    gameRef.current = createMoonGame(hostRef.current);
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [showBase]);

  // New day / mode: prefer trade-off panel, not empty walking
  useEffect(() => {
    if (mode === "choose") setShowBase(false);
    if (mode === "power") setShowBase(false);
  }, [mode, state.day]);

  const nasaStill = event
    ? nasaImageForContext(event.id, state.day)
    : nasaImageForDay(state.day);
  const photo = event?.image ?? {
    slot: nasaStill.slot,
    nasaId: nasaStill.id,
    src: nasaStill.file,
    alt: nasaStill.alt,
    credit: nasaStill.credit,
    pageUrl: nasaStill.pageUrl,
  };

  const spent = plannedPowerCost(decisions);
  const left = powerToday - spent;
  const jobs = jobRows(decisions);
  const dayLit = isDaylight(state.site, state.day);
  const planning = mode === "explore" || mode === "power";

  return (
    <section className={`phaser-play ${dayLit ? "is-day" : "is-night"}`}>
      <div className="phaser-todo" aria-label="Today's jobs">
        <strong>
          Day {state.day}/10 · Teach the trade-off · {sunBarLabel(state.site)}
        </strong>
        <ul>
          {jobs.map((j) => (
            <li key={j.id} className={j.on ? "is-on" : ""}>
              <span aria-hidden="true">{j.on ? "☑" : "☐"}</span>
              <span>
                {j.label}
                <em> · {j.where}</em>
              </span>
            </li>
          ))}
        </ul>
        <p className="phaser-todo__power">
          Power {spent}/{powerToday}
          {left < 0 ? " · too much — turn something off!" : ` · left ${left}`}
        </p>
      </div>

      <div className="phaser-play__body phaser-play__body--teach">
        <div className="phaser-play__teach">
          {planning ? (
            <PowerTradePanel
              decisions={decisions}
              powerToday={powerToday}
              onDecisions={onDecisions}
              onOpenGlossary={onOpenGlossary}
              onReady={onReadyForEvent}
              onVisitBase={() => setShowBase(true)}
            />
          ) : null}

          {mode === "choose" && event ? (
            <DecisionTeachCard
              event={event}
              day={state.day}
              onConfirm={onChoose}
              onBack={onPlanPower}
              onOpenGlossary={onOpenGlossary}
            />
          ) : null}

          {showBase ? (
            <div className="phaser-play__stage-wrap">
              <div className="phaser-play__stage-bar">
                <p>
                  Base view — plants dry if you skip watering; machines glow when
                  ON. Changes match your trade-off plan.
                </p>
                <button type="button" className="btn ghost" onClick={() => setShowBase(false)}>
                  Back to trade-offs
                </button>
              </div>
              <div className="phaser-play__stage" ref={hostRef} />
            </div>
          ) : (
            <p className="phaser-hint">
              Tip: tap <strong>See it on the base</strong> to walk around and
              watch plants/machines match your plan — after you understand the
              trade-off above.
            </p>
          )}
        </div>

        <aside className="phaser-play__side">
          <div className="phaser-side-card">
            <h3>Why this game?</h3>
            <p>
              <SpaceText
                text="Real Moon bases cannot run everything. Power, water, oxygen, and storm safety pull on each other. Every ON helps and costs."
                onOpenDrawer={onOpenGlossary}
              />
            </p>
          </div>

          <div className="phaser-side-card">
            <h3>Supplies now</h3>
            <p>
              Water {state.water} · O₂ {state.oxygen} · Risk {state.exposure}/
              {LOSE_EXPOSURE_AT}
            </p>
            <p>
              Site: {state.site === "rim" ? "sunny rim" : "darker plain"} ·{" "}
              {dayLit ? "Daylight" : "Night"} <SourceBadge badge="ASSUMPTION" />
            </p>
          </div>

          <div className="phaser-side-card">
            <h3>NASA picture</h3>
            <CardNasaImage image={photo} className="phaser-side-card__photo" />
            <p>
              <SpaceText
                text={plainTalk(
                  event?.explanation ??
                    (dayLit
                      ? "Sunny now — panels help, but chips still run out."
                      : "Night on this site — little solar power. Choices get harder."),
                )}
                onOpenDrawer={onOpenGlossary}
              />
            </p>
            <details className="how-know">
              <summary>How do we know?</summary>
              <p>
                {nasaStill.title} ({photo.nasaId}). {photo.credit}
              </p>
              <p>
                Storm timing uses NASA DONKI. Plant cards use NASA OSDR studies.
              </p>
            </details>
          </div>

          <div className="phaser-side-card">
            <h3>Weather (DONKI)</h3>
            <p>
              <SpaceText
                text={plainTalk(
                  `Sun activity ${weather.strongestFlare?.classType ?? "quiet"}. Real NASA storm data sets when storms hit your mission.`,
                )}
                onOpenDrawer={onOpenGlossary}
              />
            </p>
            <SourceBadge badge={weather.source} />
          </div>
        </aside>
      </div>
    </section>
  );
}
