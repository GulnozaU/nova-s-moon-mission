import type { DayDecisions } from "../engine/types";
import type { Event, GameState } from "../types";
import type { SpaceWeatherResult } from "../data/donkiTypes";
import { LOSE_EXPOSURE_AT } from "../engine/constants";
import { severityFromFlareClass } from "../data/severity";
import { warningFromCmeSpeed } from "../data/warning";
import { CardNasaImage } from "./CardNasaImage";
import { SourceBadge } from "./SourceBadge";
import { ART } from "./art";
import { plannedPowerCost } from "./powerMath";
import {
  COMMS_COST,
  GREENHOUSE_COST,
  HEAT_COST,
  OXYGEN_MAKER_COST,
  RECYCLER_COST,
  SCIENCE_COST_PER_LEVEL,
  SCIENCE_LEVEL_MAX,
} from "../engine/constants";

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

function meter(value: number, max: number) {
  return `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
}

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
  const spent = plannedPowerCost(decisions);
  const left = powerToday - spent;
  const flare = weather.strongestFlare;
  const severity = flare
    ? severityFromFlareClass(flare.classType).severity
    : 1;
  const speed = weather.fastestCme?.mostAccurateSpeedKmS ?? 500;
  const warning = warningFromCmeSpeed(speed, decisions.comms);
  const stormSize =
    severity === 3 ? "big" : severity === 2 ? "medium" : "small";

  const safetyOk = state.exposure < LOSE_EXPOSURE_AT * 0.55;
  const suppliesOk = state.water > 12 && state.oxygen > 8;

  return (
    <section className="dash">
      {/* Full-bleed world */}
      <div className="dash-world" aria-hidden="true">
        <img className="dash-world__bg" src={ART.lunarSurface} alt="" />
        <div className="dash-world__haze" />
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
        {/* Top bar */}
        <header className="dash-top">
          <div className="dash-title-pill">
            <span className="moon-mark" aria-hidden="true">☾</span>
            Nova&apos;s Moon Mission
          </div>
          <div className="dash-meters">
            <Meter
              icon={ART.iconZap}
              label="Power"
              value={state.battery}
              max={20}
              fill="var(--meter-power)"
            />
            <Meter
              icon={ART.iconWater}
              label="Water"
              value={state.water}
              max={40}
              fill="var(--meter-water)"
            />
            <Meter
              icon={ART.iconLeaf}
              label="O₂"
              value={state.oxygen}
              max={30}
              fill="var(--meter-o2)"
            />
            <Meter
              icon={ART.iconHeart}
              label="Risk"
              value={state.exposure}
              max={LOSE_EXPOSURE_AT}
              fill="var(--meter-risk)"
              invert
            />
          </div>
          <div className="dash-day">
            <img src={ART.iconCalendar} alt="" />
            Day {state.day} / 10
            <SourceBadge badge="ASSUMPTION" />
          </div>
        </header>

        <div className="dash-body">
          {/* Left: Nova + crew */}
          <aside className="dash-col dash-col--left">
            <button type="button" className="paper-card nova-card" onClick={onOpenGlossary}>
              <img src={ART.nova} alt="Nova" className="nova-card__face bounce" />
              <div className="speech">
                <p>
                  {mode === "choose"
                    ? "Pick carefully — both choices cost something!"
                    : mode === "power"
                      ? `You have ${powerToday} power. Heat needs ${HEAT_COST}.`
                      : "Let's keep the Moon base safe!"}
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
                  <img src={ART.iconHeart} alt="" />{" "}
                  {safetyOk ? "Healthy" : "At risk"}{" "}
                  <SourceBadge badge="ASSUMPTION" />
                </li>
                <li>
                  <img src={ART.iconWater} alt="" /> Supplies:{" "}
                  {suppliesOk ? "Good" : "Low"}{" "}
                  <SourceBadge badge="ASSUMPTION" />
                </li>
                <li>
                  <img src={ART.iconZap} alt="" /> Science {state.science}{" "}
                  <SourceBadge badge="ASSUMPTION" />
                </li>
              </ul>
            </div>
          </aside>

          {/* Center: rooms + action */}
          <div className="dash-col dash-col--center">
            <div className="room-row">
              <figure className="room-peek">
                <img src={ART.bunks} alt="Crew home" />
                <figcaption>Crew home</figcaption>
              </figure>
              <figure className="room-peek">
                <img src={ART.greenhouseIn} alt="Gardenhouse" />
                <figcaption>Gardenhouse</figcaption>
              </figure>
              <figure className="room-peek">
                <img src={ART.lab} alt="Science lab" />
                <figcaption>Science lab</figcaption>
              </figure>
            </div>

            {mode === "explore" ? (
              <div className="paper-card action-card">
                <h2>Ready for Day {state.day}?</h2>
                <p className="trade-hint">
                  First spend power. Then a choice with a clear help and a clear cost.
                </p>
                <div className="world-taps">
                  <button type="button" className="tap-chip" onClick={onPlanPower}>
                    <img src={ART.panels} alt="" className="shimmer" />
                    Power plan
                  </button>
                  <button
                    type="button"
                    className="tap-chip"
                    onClick={() =>
                      onDecisions((d) => ({ ...d, greenhouse: !d.greenhouse }))
                    }
                  >
                    <img src={ART.greenhouseDome} alt="" className="bob" />
                    Greenhouse {decisions.greenhouse ? "ON" : "off"}
                  </button>
                  <button
                    type="button"
                    className="tap-chip"
                    onClick={() =>
                      onDecisions((d) => ({ ...d, comms: !d.comms }))
                    }
                  >
                    <img src={ART.dish} alt="" className="spin-slow" />
                    Radio {decisions.comms ? "ON" : "off"}
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
                  <Toggle
                    on={true}
                    forced
                    icon={ART.iconSun}
                    title="Heat"
                    help="Keeps the crew warm"
                    cost={`Always ${HEAT_COST} power`}
                  />
                  <Toggle
                    on={decisions.recycler}
                    icon={ART.iconWater}
                    title="Water cleaner"
                    help="Uses only 1 water instead of 4"
                    cost={`${RECYCLER_COST} power`}
                    onClick={() =>
                      onDecisions({ ...decisions, recycler: !decisions.recycler })
                    }
                  />
                  <Toggle
                    on={decisions.oxygenMaker}
                    icon={ART.iconLeaf}
                    title="Air maker"
                    help="+3 oxygen"
                    cost={`${OXYGEN_MAKER_COST} power + 1 water`}
                    onClick={() =>
                      onDecisions({
                        ...decisions,
                        oxygenMaker: !decisions.oxygenMaker,
                      })
                    }
                  />
                  <Toggle
                    on={decisions.comms}
                    icon={ART.dish}
                    title="Talk to Earth"
                    help="Full storm warning time"
                    cost={`${COMMS_COST} power`}
                    onClick={() =>
                      onDecisions({ ...decisions, comms: !decisions.comms })
                    }
                  />
                  <Toggle
                    on={Boolean(decisions.greenhouse)}
                    icon={ART.greenhouseDome}
                    title="Greenhouse"
                    help="+1 oxygen and +1 science"
                    cost={`${GREENHOUSE_COST} power + 2 water`}
                    onClick={() =>
                      onDecisions({
                        ...decisions,
                        greenhouse: !decisions.greenhouse,
                      })
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
                    Helps: more science · Costs: {SCIENCE_COST_PER_LEVEL} power each +
                    a little risk
                  </small>
                </div>
                {left < 0 ? (
                  <p className="warn">Too much power used — turn something off.</p>
                ) : null}
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
              <div className="paper-card action-card choose-board">
                <p className="eyebrow">
                  What should Nova do? <SourceBadge badge={event.sourceBadge} />
                </p>
                <h2>{event.title}</h2>
                {event.image ? (
                  <CardNasaImage image={event.image} className="choose-photo" />
                ) : null}
                <p className="choose-explain">{event.explanation}</p>
                <div className="trade-options">
                  <button
                    type="button"
                    className="trade-btn"
                    onClick={() => onChoose("A")}
                  >
                    <img src={ART.iconShield} alt="" className="bob" />
                    <strong>{event.optionA.label}</strong>
                    <span className="helps">↑ Helps: {event.optionA.benefit}</span>
                    <span className="costs">↓ Costs: {event.optionA.cost}</span>
                  </button>
                  <button
                    type="button"
                    className="trade-btn"
                    onClick={() => onChoose("B")}
                  >
                    <img src={ART.rover} alt="" className="drive" />
                    <strong>{event.optionB.label}</strong>
                    <span className="helps">↑ Helps: {event.optionB.benefit}</span>
                    <span className="costs">↓ Costs: {event.optionB.cost}</span>
                  </button>
                </div>
                <button type="button" className="btn ghost" onClick={onBackExplore}>
                  Back to power
                </button>
              </div>
            ) : null}
          </div>

          {/* Right: weather + science + log */}
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
                NASA saw a {stormSize} storm. Cloud may arrive in about{" "}
                {warning.warningDays} day{warning.warningDays === 1 ? "" : "s"}.
              </p>
              <p className="muted">
                Date: {weather.eventDate ?? "archived"} ·{" "}
                <SourceBadge badge={weather.source} />
              </p>
            </div>

            <div className="paper-card science-box">
              <h3>Real space picture</h3>
              <CardNasaImage slot="storm" className="science-box__photo" />
              <p className="muted">
                Real data from NASA DONKI
                {flare ? ` · ${flare.classType}` : ""}. Not made or endorsed by NASA.
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
  invert,
}: {
  icon: string;
  label: string;
  value: number;
  max: number;
  fill: string;
  invert?: boolean;
}) {
  const pct = invert
    ? Math.min(100, (value / max) * 100)
    : Math.min(100, (value / max) * 100);
  return (
    <div className="meter" title={`${label}: ${value}`}>
      <img src={icon} alt="" />
      <div className="meter__track">
        <div className="meter__fill" style={{ width: meter(value, max), background: fill }} />
      </div>
      <span>
        {label} {Math.round(pct)}%
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
    <button
      type="button"
      className={`toggle ${on ? "is-on" : ""}`}
      onClick={onClick}
    >
      {inner}
    </button>
  );
}
