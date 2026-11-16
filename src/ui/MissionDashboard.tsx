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
import {
  nasaImageForContext,
  nasaImageForDay,
} from "../content/imageForContext";
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

  const nasaStill = event
    ? nasaImageForContext(event.id, state.day)
    : mode === "power"
      ? nasaImageForContext("weather", state.day)
      : nasaImageForDay(state.day);
  const contextPhoto = event?.image ?? {
    slot: nasaStill.slot,
    nasaId: nasaStill.id,
    src: nasaStill.file,
    alt: nasaStill.alt,
    credit: nasaStill.credit,
    pageUrl: nasaStill.pageUrl,
  };

  const contextPlain = event
    ? plainTalk(
        event.id === "lunar-dust"
          ? "Apollo crews found Moon dust stuck to suits and machines."
          : event.id === "greenhouse-experiment"
            ? "Scientists grew plants with lunar material. Here is one finding."
            : event.id === "solar-storm"
              ? weatherLine
              : event.explanation,
      )
    : nasaCaptionForDay(state.day);

  const canActInRooms = mode === "explore" || mode === "power";

  if (room) {
    return (
      <RoomView
        key={room}
        room={room}
        isDay={dayLit}
        decisions={decisions}
        onDecisions={onDecisions}
        canAct={canActInRooms}
        onClose={() => setRoom(null)}
        onOpenGlossary={onOpenGlossary}
      />
    );
  }

  return (
    <section className={`dash ${dayLit ? "is-day" : "is-night"}`}>
      <div className="dash-world">
        <img className="dash-world__bg" src={ART.lunarSurface} alt="" />
        <div className="dash-world__haze" />
        <div className="sky-cycle" />
        <img className="actor actor--earth sway" src={ART.earthMoon} alt="" />
        <button
          type="button"
          className="actor actor--habitat breathe"
          onClick={() => setRoom("home")}
          aria-label="Open crew home"
        >
          <img src={ART.habitatDome} alt="" />
        </button>
        <button
          type="button"
          className="actor actor--lab breathe-delay"
          onClick={() => setRoom("lab")}
          aria-label="Open science lab"
        >
          <img src={ART.cottage} alt="" />
        </button>
        <button
          type="button"
          className="actor actor--green bob"
          onClick={() => setRoom("greenhouse")}
          aria-label="Open greenhouse"
        >
          <img src={ART.greenhouseDome} alt="" />
        </button>
        <img className="actor actor--panels shimmer" src={ART.panels} alt="" />
        <img className="actor actor--dish spin-slow" src={ART.dish} alt="" />
        <img className="actor actor--rover drive" src={ART.rover} alt="" />
        <img className="actor actor--nova work-a" src={ART.nova} alt="" />
        <img className="actor actor--girl work-b" src={ART.novaGirlHelmet} alt="" />
        <img className="actor actor--worker work-c" src={ART.novaGirlGlasses} alt="" />
        <div className="work-spark work-spark--a" aria-hidden="true" />
        <div className="work-spark work-spark--b" aria-hidden="true" />
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
            <Meter icon={ART.iconZap} label="Power" value={state.battery} max={12} fill="var(--meter-power)" />
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
                          ? `Walk into a room and DO jobs. You have ${powerToday} power. Heat always uses ${HEAT_COST}.`
                          : dayLit
                            ? "Tap a door below. Go inside and grab things!"
                            : "Night on the plain — save power. Still go inside and choose jobs carefully."
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
                <span className="room-peek__go">Go inside · grab wrench</span>
                <figcaption>Crew home</figcaption>
              </button>
              <button type="button" className="room-peek" onClick={() => setRoom("greenhouse")}>
                <img src={ART.greenhouseIn} alt="" />
                <span className="room-peek__go">Go inside · add water</span>
                <figcaption>Greenhouse</figcaption>
              </button>
              <button type="button" className="room-peek" onClick={() => setRoom("lab")}>
                <img src={ART.lab} alt="" />
                <span className="room-peek__go">Go inside · plan walk</span>
                <figcaption>Science lab</figcaption>
              </button>
            </div>
            <p className="room-hint">
              Real game play: walk in → grab a tool → tap what you want to use.
            </p>

            {mode === "explore" ? (
              <div className="paper-card action-card">
                <h2>Day {state.day}: do jobs with Nova</h2>
                <p className="trade-hint">
                  <SpaceText
                    text="Do not only press a big button. Go inside a room. Grab. Add water. Flip machines."
                    onOpenDrawer={onOpenGlossary}
                  />
                </p>
                <JobsChecklist decisions={decisions} />
                <div className="world-taps">
                  <button type="button" className="tap-chip" onClick={() => setRoom("home")}>
                    <img src={ART.bunks} alt="" />
                    Fix machines
                  </button>
                  <button type="button" className="tap-chip" onClick={() => setRoom("greenhouse")}>
                    <img src={ART.greenhouseDome} alt="" className="bob" />
                    Water plants
                  </button>
                  <button type="button" className="tap-chip" onClick={() => setRoom("lab")}>
                    <img src={ART.novaGirlGlasses} alt="" className="sway" />
                    Plan science
                  </button>
                </div>
                <button type="button" className="btn primary wide pulse" onClick={onPlanPower}>
                  Check power used →
                </button>
              </div>
            ) : null}

            {mode === "power" ? (
              <div className="paper-card action-card power-board">
                <h2>Power check</h2>
                <p>
                  Using <strong>{spent}</strong> of {powerToday} · left for battery{" "}
                  <strong>{Math.max(0, left)}</strong>{" "}
                  <SourceBadge badge="ASSUMPTION" />
                </p>
                <p className="trade-hint">
                  Change a job by going back into a room. Heat always stays on (
                  {HEAT_COST} power).
                </p>
                <JobsChecklist decisions={decisions} detailed />
                <div className="world-taps">
                  <button type="button" className="tap-chip" onClick={() => setRoom("home")}>
                    Crew home
                  </button>
                  <button type="button" className="tap-chip" onClick={() => setRoom("greenhouse")}>
                    Greenhouse
                  </button>
                  <button type="button" className="tap-chip" onClick={() => setRoom("lab")}>
                    Science lab
                  </button>
                </div>
                {left < 0 ? (
                  <p className="warn">Too much power — go turn something off in a room.</p>
                ) : null}
                <div className="row-actions">
                  <button type="button" className="btn ghost" onClick={onBackExplore}>
                    Keep working
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={left < 0}
                    onClick={onReadyForEvent}
                  >
                    See today&apos;s choice →
                  </button>
                </div>
              </div>
            ) : null}

            {mode === "choose" && event ? (
              <DecisionTeachCard
                event={event}
                day={state.day}
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
              <h3>Today&apos;s NASA picture</h3>
              <CardNasaImage image={contextPhoto} className="science-box__photo" />
              <p>
                <SpaceText text={contextPlain} onOpenDrawer={onOpenGlossary} />
              </p>
              <details className="how-know">
                <summary>How do we know?</summary>
                <p>
                  {nasaStill.title} ({contextPhoto.nasaId}). {contextPhoto.credit}
                </p>
              </details>
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
                        Day {d.day}: {kidEventName(d.eventId)} → {d.choice}
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

function JobsChecklist({
  decisions,
  detailed,
}: {
  decisions: DayDecisions;
  detailed?: boolean;
}) {
  const jobs = [
    {
      on: true,
      label: detailed ? `Heat (always ${HEAT_COST} power)` : "Heat on",
    },
    {
      on: decisions.recycler,
      label: detailed
        ? `Water cleaner (${RECYCLER_COST} power) — crew home`
        : "Water cleaner",
    },
    {
      on: decisions.oxygenMaker,
      label: detailed
        ? `Air maker (${OXYGEN_MAKER_COST} power) — crew home`
        : "Air maker",
    },
    {
      on: decisions.comms,
      label: detailed ? `Talk to Earth (${COMMS_COST} power) — crew home` : "Talk to Earth",
    },
    {
      on: Boolean(decisions.greenhouse),
      label: detailed
        ? `Greenhouse (${GREENHOUSE_COST} power + 2 water)`
        : "Water plants",
    },
    {
      on: decisions.scienceLevel > 0,
      label: detailed
        ? `Science walks ×${decisions.scienceLevel} (${SCIENCE_COST_PER_LEVEL} each, max ${SCIENCE_LEVEL_MAX})`
        : `Science walks ×${decisions.scienceLevel}`,
    },
  ];
  return (
    <ul className="jobs-list">
      {jobs.map((j) => (
        <li key={j.label} className={j.on ? "is-on" : ""}>
          <span aria-hidden="true">{j.on ? "☑" : "☐"}</span> {j.label}
        </li>
      ))}
    </ul>
  );
}

function nasaCaptionForDay(day: number): string {
  const caps = [
    "Earth hangs in the Moon sky — our home is far away.",
    "The Sun can throw storm clouds. NASA watches every day.",
    "Near the south pole, some crater rims stay sunny.",
    "Wide Moon plains look quiet — but power changes with night.",
    "Moon dust sticks to suits and machines.",
    "NASA grew plants with lunar material in a lab on Earth.",
  ];
  return caps[(day - 1) % caps.length]!;
}

function kidEventName(id: string): string {
  if (id === "solar-storm") return "Sun storm";
  if (id === "lunar-dust") return "Moon dust";
  if (id === "greenhouse-experiment") return "Plant day";
  if (id === "delayed-message") return "Earth message";
  if (id === "supply-drop") return "Supply drop";
  if (id === "battery-surge") return "Extra power";
  return id;
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
