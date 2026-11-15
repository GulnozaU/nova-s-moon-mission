import { useEffect, useRef } from "react";
import type { DayDecisions } from "../engine/types";
import type { Event, GameState } from "../types";
import type { SpaceWeatherResult } from "../data/donkiTypes";
import { LOSE_EXPOSURE_AT } from "../engine/constants";
import { plainTalk } from "../content/banned";
import { nasaImageForContext, nasaImageForDay } from "../content/imageForContext";
import { CardNasaImage } from "../ui/CardNasaImage";
import { SourceBadge } from "../ui/SourceBadge";
import { DecisionTeachCard } from "../ui/teach/DecisionTeachCard";
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
          ? "Pick A or B — they help and cost different things."
          : "Click glowing tools and machines. Jobs stay on top.",
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

  return (
    <section className={`phaser-play ${dayLit ? "is-day" : "is-night"}`}>
      <div className="phaser-todo" aria-label="Today's jobs">
        <strong>Today&apos;s jobs</strong>
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
          {left < 0 ? " · too much!" : ` · left ${left}`} · {sunBarLabel(state.site)}
        </p>
      </div>

      <div className="phaser-play__body">
        <div className="phaser-play__stage" ref={hostRef} />

        <aside className="phaser-play__side">
          <div className="phaser-side-card">
            <h3>How to play</h3>
            <ol>
              <li>
                <strong>Click</strong> glowing tools and machines (mouse/cursor)
              </li>
              <li>
                Grab shows next to your pointer (wrench / can / notebook)
              </li>
              <li>Watch plants: green = watered, brown = dry</li>
              <li>Click yellow Day board when jobs look right</li>
            </ol>
          </div>

          <div className="phaser-side-card">
            <h3>Supplies</h3>
            <p>
              Water {state.water} · O₂ {state.oxygen} · Risk {state.exposure}/
              {LOSE_EXPOSURE_AT} <SourceBadge badge="ASSUMPTION" />
            </p>
            <p>
              Site: {state.site === "rim" ? "sunny rim" : "darker plain"} ·{" "}
              {dayLit ? "Daylight" : "Night"}
            </p>
            {left < 0 ? (
              <p className="warn">Too much power — turn something off.</p>
            ) : null}
          </div>

          <div className="phaser-side-card">
            <h3>NASA picture</h3>
            <CardNasaImage image={photo} className="phaser-side-card__photo" />
            <p>
              <SpaceText
                text={plainTalk(
                  event?.explanation ??
                    (dayLit
                      ? "Sunny now — good time for careful outdoor work."
                      : "Night on this site — solar panels make less power."),
                )}
                onOpenDrawer={onOpenGlossary}
              />
            </p>
          </div>

          {mode === "choose" && event ? (
            <div className="phaser-side-card phaser-side-card--choice">
              <DecisionTeachCard
                event={event}
                day={state.day}
                onConfirm={onChoose}
                onBack={onPlanPower}
                onOpenGlossary={onOpenGlossary}
              />
            </div>
          ) : (
            <div className="phaser-side-card">
              <h3>Weather</h3>
              <p>
                <SpaceText
                  text={plainTalk(
                    `Sun activity is ${weather.strongestFlare?.classType ?? "quiet"}. NASA watches so crews can get ready.`,
                  )}
                  onOpenDrawer={onOpenGlossary}
                />
              </p>
              <SourceBadge badge={weather.source} />
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
