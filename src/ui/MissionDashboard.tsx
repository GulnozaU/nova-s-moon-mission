import { useState } from "react";
import type { DayDecisions } from "../engine/types";
import type { Event, GameState } from "../types";
import type { SpaceWeatherResult } from "../data/donkiTypes";
import {
  COMMS_COST,
  GREENHOUSE_COST,
  HEAT_COST,
  LOSE_EXPOSURE_AT,
  OXYGEN_MAKER_COST,
  RECYCLER_COST,
  SCIENCE_COST_PER_LEVEL,
  SCIENCE_LEVEL_MAX,
} from "../engine/constants";
import { severityFromFlareClass } from "../data/severity";
import { warningFromCmeSpeed } from "../data/warning";
import { plainTalk } from "../content/banned";
import { CardNasaImage } from "./CardNasaImage";
import { SourceBadge } from "./SourceBadge";
import { ART } from "./art";
import { plannedPowerCost } from "./powerMath";
import { DecisionTeachCard } from "./teach/DecisionTeachCard";
import { isDaylight, sunBarLabel } from "./teach/dayNight";
import { RoomView, type RoomId } from "./teach/RoomView";
import { SpaceText } from "./teach/SpaceText";
import { ReadAloudButton } from "./teach/ReadAloudButton";

type Props = {
  state: GameState;
  weather: SpaceWeatherResult;
  event: Event | null;
  decisions: DayDecisions;
  powerToday: number;
  mode: "explore" | "power" | "choose";
  onDecisions: (d: DayDecisions | ((p: DayDecisions) => DayDecisions)) => void;
  onPlanPower: () => void;
  onReadyForEvent: () => void;
  onChoose: (c: "A" | "B") => void;
  onOpenGlossary: () => void;
  onBackExplore: () => void;
};

export function MissionDashboard({
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
  onBackExplore,
}: Props) {
  const [room, setRoom] = useState<RoomId | null>(null);
  const spent = plannedPowerCost(decisions);
  const left = powerToday - spent;
  const dayLit = isDaylight(state.site, state.day);
  const flare = weather.strongestFlare;
  const severity =
    (flare ? severityFromFlareClass(flare.classType).severity : null) ?? 1;
  const speed = weather.fastestCme?.mostAccurateSpeedKmS ?? 500;
  const warning = warningFromCmeSpeed(speed, decisions.comms);
  const stormSize =
    severity === 3 ? "big" : severity === 2 ? "medium" : "small";
  const safetyOk = state.exposure < LOSE_EXPOSURE_AT * 0.55;
  const suppliesOk = state.water > 12 && state.oxygen > 8;
  const weatherLine = plainTalk(
    `NASA saw a ${stormSize} storm on the Sun. The storm cloud may reach the Moon in about ${warning.warningDays} day${warning.warningDays === 1 ? "" : "s"}.`,
  );

  if (room) {
    return (
      <RoomView
        room={room}
        isDay={dayLit}
        onClose={() => setRoom(null)}
        onOpenGlossary={onOpenGlossary}
      />
    );
  }

  return (
    <section className={`dash ${dayLit ? "is-day" : "is-night"}`}>
      <div className="dash-world" aria-hidden="true">
        <img className="dash-world__bg" src={ART.lunarSurface} alt="" />
        <div className="dash-world__haze" />
        <div className="sky-cycle" />
        <img className="actor actor--earth sway" src={ART.earthMoon} alt="" />
        <img className="actor actor--habitat breathe" src={ART.habitatDome} alt="" />
        <img className="actor actor--lab breathe-delay" src={ART.cottage} alt="" />
        <img className="actor actor--green bob" src={ART.greenhouseDome} alt="" />
        <img className="actor actor--panels shimmer" src={ART.panels} alt="" />
        <img className="actor actor--dish spin-slow" src={ART.dish} alt="" />
        <img className="actor actor--rover drive" src={ART.rover} alt="" />
        <img className="actor actor--nova bounce" src={ART.nova} alt="" />
        <img className="actor actor--girl sway" src={ART.novaGirlHelmet} alt="" />
      </div>

      <div className="dash-ui">
        <header className="dash-top">
          <div className="dash-title-pill">
            <span className="moon-mark" aria-hidden="true">
              {dayLit ? "☀" : "☾"}
            </span>
            Nova&apos;s Moon Mission
          </div>
          <div className="dash-meters">
            <Meter icon={ART.iconZap} label="Power" value={state.battery} max={20} fill="var(--meter-power)" />
            <Meter icon={ART.iconWater} label="Water" value={state.water} max={40} fill="var(--meter-water)" />
            <Meter icon={ART.iconLeaf} label="O₂" value={state.oxygen} max={30} fill="var(--meter-o2)" />
            <Meter icon={ART.iconHeart} label="Risk" value={state.exposure} max={LOSE_EXPOSURE_AT} fill="var(--meter-risk)" />
          </div>
          <div className="dash-day">
            <img src={ART.iconCalendar} alt="" />
            Day {state.day} / 10 · {dayLit ? "Day" : "Night"}
            <SourceBadge badge="ASSUMPTION" />
          </div>
        </header>

        <div className="sun-bar paper-card">
          <span>{sunBarLabel(state.site)}</span>
          <div className="sun-bar__track">
            <div className={`sun-bar__knob ${dayLit ? "is-day" : "is-night"}`} />
          </div>
          <SourceBadge badge="ASSUMPTION" />
        </div>

        <div className="dash-body">
          <aside className="dash-col dash-col--left">
            <button type="button" className="paper-card nova-card" onClick={onOpenGlossary}>
              <img src={ART.nova} alt="Nova" className="nova-card__face bounce" />
              <div className="speech">
                <p>
                  <SpaceText
                    text={
                      mode === "choose"
                        ? "Read both sides. Every choice helps and costs."
                        : mode === "power"
                          ? `You have ${powerToday} power. Heat needs ${HEAT_COST}.`
                          : dayLit
                            ? "Sunny now — good time for careful work!"
                            : "Night on the plain — save power chips."
                    }
                    onOpenDrawer={onOpenGlossary}
                  />
                </p>
              </div>
            </button>

            <div className="paper-card crew-card">
              <h3>Crew status</h3>
              <div className="crew-faces">
                <img src={ART.nova} alt="" className="bob" />
                <img src={ART.novaGirlHelmet} alt="" className="bob-delay" />
                <img src={ART.novaGirlGlasses} alt="" className="sway" />
              </div>
              <ul>
                <li>
                  <img src={ART.iconHeart} alt="" /> {safetyOk ? "Healthy" : "At risk"}{" "}
                  <SourceBadge badge="ASSUMPTION" />
                </li>
                <li>
                  <img src={ART.iconWater} alt="" /> Supplies: {suppliesOk ? "Good" : "Low"}{" "}
                  <SourceBadge badge="ASSUMPTION" />
                </li>
                <li>
                  <img src={ART.iconZap} alt="" /> Science {state.science}{" "}
                  <SourceBadge badge="ASSUMPTION" />
                </li>
              </ul>
            </div>
          </aside>

          <div className="dash-col dash-col--center">
            <div className="room-row">
              <button type="button" className="room-peek" onClick={() => setRoom("home")}>
                <img src={ART.bunks} alt="" />
                <figcaption>Go in · Crew home</figcaption>
              </button>
              <button type="button" className="room-peek" onClick={() => setRoom("greenhouse")}>
                <img src={ART.greenhouseIn} alt="" />
                <figcaption>Go in · Gardenhouse</figcaption>
              </button>
              <button type="button" className="room-peek" onClick={() => setRoom("lab")}>
                <img src={ART.lab} alt="" />
                <figcaption>Go in · Science lab</figcaption>
              </button>
            </div>

            {mode === "explore" ? (
              <div className="paper-card action-card">
                <h2>Ready for Day {state.day}?</h2>
                <p className="trade-hint">
                  <SpaceText
                    text="First spend power. Then a choice with a clear help and cost."
                    onOpenDrawer={onOpenGlossary}
                  />
                </p>
                <div className="world-taps">
                  <button type="button" className="tap-chip" onClick={onPlanPower}>
                    <img src={ART.panels} alt="" className="shimmer" />
                    Power plan
                  </button>
                  <button type="button" className="tap-chip" onClick={() => setRoom("greenhouse")}>
                    <img src={ART.greenhouseDome} alt="" className="bob" />
                    Visit plants
                  </button>
                  <button type="button" className="tap-chip" onClick={() => setRoom("lab")}>
                    <img src={ART.novaGirlGlasses} alt="" className="sway" />
                    Visit lab
                  </button>
                </div>
                <button type="button" className="btn primary wide pulse" onClick={onPlanPower}>
                  Plan today&apos;s power →
                </button>
              </div>
            ) : null}

            {mode === "power" ? (
              <div className="paper-card action-card power-board">
                <h2>Spend your {powerToday} power</h2>
                <p>
                  Using <strong>{spent}</strong> · left for battery{" "}
                  <strong>{Math.max(0, left)}</strong>{" "}
                  <SourceBadge badge="ASSUMPTION" />
                </p>
                <div className="power-grid">
                  <Toggle forced on icon={ART.iconSun} title="Heat" help="Keeps the crew warm" cost={`Always ${HEAT_COST} power`} />
                  <Toggle
                    on={decisions.recycler}
                    icon={ART.iconWater}
                    title="Water cleaner"
                    help="Uses only 1 water instead of 4"
                    cost={`${RECYCLER_COST} power`}
                    onClick={() => onDecisions({ ...decisions, recycler: !decisions.recycler })}
                  />
                  <Toggle
                    on={decisions.oxygenMaker}
                    icon={ART.iconLeaf}
                    title="Air maker"
                    help="+3 oxygen"
                    cost={`${OXYGEN_MAKER_COST} power + 1 water`}
                    onClick={() =>
                      onDecisions({ ...decisions, oxygenMaker: !decisions.oxygenMaker })
                    }
                  />
                  <Toggle
                    on={decisions.comms}
                    icon={ART.dish}
                    title="Talk to Earth"
                    help="Full storm warning time"
                    cost={`${COMMS_COST} power`}
                    onClick={() => onDecisions({ ...decisions, comms: !decisions.comms })}
                  />
                  <Toggle
                    on={Boolean(decisions.greenhouse)}
                    icon={ART.greenhouseDome}
                    title="Greenhouse"
                    help="+1 oxygen and +1 science"
                    cost={`${GREENHOUSE_COST} power + 2 water`}
                    onClick={() =>
                      onDecisions({ ...decisions, greenhouse: !decisions.greenhouse })
                    }
                  />
                </div>
                <div className="science-row">
                  <span>Outside science</span>
                  <button
                    type="button"
                    onClick={() =>
                      onDecisions({
                        ...decisions,
                        scienceLevel: Math.max(0, decisions.scienceLevel - 1),
                      })
                    }
                  >
                    −
                  </button>
                  <strong>
                    {decisions.scienceLevel}/{SCIENCE_LEVEL_MAX}
                  </strong>
                  <button
                    type="button"
                    onClick={() =>
                      onDecisions({
                        ...decisions,
                        scienceLevel: Math.min(
                          SCIENCE_LEVEL_MAX,
                          decisions.scienceLevel + 1,
                        ),
                      })
                    }
                  >
                    +
                  </button>
                  <small>
                    ↑ more science · ↓ {SCIENCE_COST_PER_LEVEL} power each + a little risk
                  </small>
                </div>
                {left < 0 ? <p className="warn">Too much power — turn something off.</p> : null}
                <div className="row-actions">
                  <button type="button" className="btn ghost" onClick={onBackExplore}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={left < 0}
                    onClick={onReadyForEvent}
                  >
                    See the trade-off →
                  </button>
                </div>
              </div>
            ) : null}

            {mode === "choose" && event ? (
              <DecisionTeachCard
                event={event}
                onConfirm={onChoose}
                onBack={onBackExplore}
                onOpenGlossary={onOpenGlossary}
              />
            ) : null}
          </div>

          <aside className="dash-col dash-col--right">
            <div className="paper-card weather-box">
              <div className="weather-box__head">
                <img
                  src={severity === 3 ? ART.iconSun : ART.iconSunMed}
                  alt=""
                  className="spin-slow"
                />
                <div>
                  <h3>Weather today</h3>
                  <SourceBadge badge={weather.source} />
                </div>
              </div>
              <p className="storm-callout">
                {severity && severity >= 2 ? "Solar storm incoming!" : "Sun is active"}
              </p>
              <p>
                <SpaceText text={weatherLine} onOpenDrawer={onOpenGlossary} />
              </p>
              <p className="muted">
                NASA saw this on {weather.eventDate ?? "an archived day"}.
              </p>
              <ReadAloudButton text={weatherLine} />
              <details className="how-know">
                <summary>How do we know?</summary>
                <p>
                  {flare
                    ? `Flare ${flare.classType} · id ${flare.flrID}`
                    : "Archived NASA storm record."}
                  {weather.fastestCme
                    ? ` · cloud speed ~${Math.round(weather.fastestCme.mostAccurateSpeedKmS ?? 0)} km/s`
                    : ""}
                </p>
              </details>
            </div>

            <div className="paper-card science-box">
              <h3>Real space picture</h3>
              <CardNasaImage slot="storm" className="science-box__photo" />
              <p className="muted">
                Real data from NASA. Not made or endorsed by NASA.
              </p>
            </div>

            <div className="paper-card log-box">
              <h3>Mission log</h3>
              <ul>
                {state.log.length === 0 ? (
                  <li>Day {state.day}: Base is online.</li>
                ) : (
                  state.log
                    .slice(-4)
                    .reverse()
                    .map((d) => (
                      <li key={d.day}>
                        Day {d.day}: {d.eventId} → {d.choice}
                      </li>
                    ))
                )}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Meter({
  icon,
  label,
  value,
  max,
  fill,
}: {
  icon: string;
  label: string;
  value: number;
  max: number;
  fill: string;
}) {
  const width = `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
  return (
    <div className="meter" title={`${label}: ${value}`}>
      <img src={icon} alt="" />
      <div className="meter__track">
        <div className="meter__fill" style={{ width, background: fill }} />
      </div>
      <span>
        {label} {Math.round((value / max) * 100)}%
      </span>
    </div>
  );
}

function Toggle({
  on,
  forced,
  icon,
  title,
  help,
  cost,
  onClick,
}: {
  on: boolean;
  forced?: boolean;
  icon: string;
  title: string;
  help: string;
  cost: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <img src={icon} alt="" />
      <div>
        <strong>{title}</strong>
        <span className="helps">↑ {help}</span>
        <span className="costs">↓ {cost}</span>
      </div>
      <em>{forced ? "ON" : on ? "ON" : "off"}</em>
    </>
  );
  if (forced || !onClick) {
    return <div className={`toggle ${on ? "is-on" : ""} is-forced`}>{inner}</div>;
  }
  return (
    <button type="button" className={`toggle ${on ? "is-on" : ""}`} onClick={onClick}>
      {inner}
    </button>
  );
}
