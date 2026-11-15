import { CardNasaImage } from "./CardNasaImage";
import { BaseScene } from "./BaseScene";
import { DayResultView } from "./DayResult";
import { EventCardView } from "./EventCard";
import { GlossaryDrawer } from "./GlossaryDrawer";
import { LegendScreen } from "./LegendScreen";
import { PowerPanel } from "./PowerPanel";
import { ResourceBars } from "./ResourceBars";
import { SourceBadge } from "./SourceBadge";
import { WeatherCard } from "./WeatherCard";
import { ART } from "./art";
import { getNasaImage } from "../content/images";
import { useGameSession } from "./useGameSession";
import "./game.css";

const TRAINING = [
  {
    title: "Power is limited",
    body: "You get a few power chips each day. Heat always needs some.",
    art: ART.panels,
  },
  {
    title: "Water and air matter",
    body: "Turn on the water cleaner and air maker, or tanks drop fast.",
    art: ART.waterTower,
  },
  {
    title: "Storms are real",
    body: "NASA watches the Sun. A storm day can hurt if you stay outside.",
    art: ART.iconSun,
  },
];

export function GameApp() {
  const g = useGameSession();

  return (
    <div className="nova-app">
      <a className="skip-link" href="#main">
        Skip to game
      </a>
      <header className="nova-top">
        <button type="button" className="brand" onClick={() => g.setPhase("welcome")}>
          <img src={ART.nova} alt="" />
          <span>Nova&apos;s Moon Mission</span>
        </button>
        <nav>
          <button type="button" className="btn ghost" onClick={() => g.setGlossaryOpen(true)}>
            Space words
          </button>
          <button type="button" className="btn ghost" onClick={g.openLegend}>
            What is real?
          </button>
        </nav>
      </header>

      <main id="main" className="nova-main">
        {g.phase === "welcome" ? (
          <section className="screen welcome-screen">
            <div className="welcome-hero" style={{ backgroundImage: `url(${ART.lunarSurface})` }}>
              <img src={ART.nova} alt="Nova the young astronaut" className="welcome-hero__nova float-soft" />
              <CardNasaImage slot="title" className="welcome-hero__nasa" />
            </div>
            <div className="welcome-copy">
              <p className="eyebrow">Real data from NASA</p>
              <h1>Help Nova run a Moon base for 10 days</h1>
              <p>
                Spend power wisely, watch real space weather, and keep water, air, and
                crew safety okay.
              </p>
              <div className="panel__actions">
                <button type="button" className="btn primary" onClick={g.startTraining}>
                  Start training
                </button>
                <button type="button" className="btn ghost" onClick={g.openLegend}>
                  Badge legend
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {g.phase === "training" ? (
          <section className="screen training-screen panel">
            <p className="eyebrow">
              Training {g.trainingStep + 1} / {TRAINING.length}
            </p>
            <img
              src={TRAINING[g.trainingStep]!.art}
              alt=""
              className="training-art bob"
            />
            <h2>{TRAINING[g.trainingStep]!.title}</h2>
            <p>{TRAINING[g.trainingStep]!.body}</p>
            <div className="panel__actions">
              {g.trainingStep > 0 ? (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => g.setTrainingStep(g.trainingStep - 1)}
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  if (g.trainingStep >= TRAINING.length - 1) g.setPhase("site");
                  else g.setTrainingStep(g.trainingStep + 1);
                }}
              >
                {g.trainingStep >= TRAINING.length - 1 ? "Pick a site" : "Next"}
              </button>
            </div>
          </section>
        ) : null}

        {g.phase === "site" ? (
          <section className="screen site-screen">
            <h2>Where should Nova build?</h2>
            <p>Each place has a clear trade-off.</p>
            <div className="site-grid">
              {g.siteRecords.map((site) => {
                const slot = site.imageSlot as "southPole" | "equatorial";
                const nasa = getNasaImage(slot);
                return (
                  <button
                    key={site.id}
                    type="button"
                    className="site-card"
                    onClick={() => void g.pickSite(site.id as "rim" | "plain")}
                  >
                    <CardNasaImage slot={slot} />
                    <h3>{site.name}</h3>
                    <p>{site.illumination.summary}</p>
                    <p className="site-card__trade">
                      {site.id === "rim"
                        ? "More steady power · less science each walk"
                        : "More science · dark nights with little power"}
                    </p>
                    <SourceBadge
                      badge={
                        ("powerBadge" in site.illumination
                          ? site.illumination.powerBadge
                          : "badge" in site.illumination
                            ? site.illumination.badge
                            : "ASSUMPTION") as "ASSUMPTION" | "REFERENCE"
                      }
                    />
                    <span className="btn primary">Build here · {nasa.id}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {g.phase === "loading" ? (
          <section className="screen panel loading-screen" aria-busy="true">
            <img src={ART.rover} alt="" className="bob" />
            <h2>Talking to NASA data…</h2>
            <p>Loading space weather and plant studies. This stays on your device — no login.</p>
          </section>
        ) : null}

        {g.phase === "error" ? (
          <section className="screen panel error-screen" role="alert">
            <h2>Could not load live data</h2>
            <p>{g.loadError ?? "Something went wrong."}</p>
            <p>We can still play with archived NASA records.</p>
            <div className="panel__actions">
              <button type="button" className="btn primary" onClick={() => void g.retryLoad()}>
                Try again
              </button>
              <button type="button" className="btn ghost" onClick={() => g.setPhase("site")}>
                Pick site again
              </button>
            </div>
          </section>
        ) : null}

        {g.phase === "base" && g.state && g.weather ? (
          <section className="screen base-screen">
            <div className="base-layout">
              <BaseScene
                site={g.state.site}
                onOpenPower={g.goPower}
                onOpenGreenhouse={() => {
                  g.setDecisions((d) => ({ ...d, greenhouse: true }));
                  g.goPower();
                }}
                onOpenComms={() => {
                  g.setDecisions((d) => ({ ...d, comms: true }));
                  g.goPower();
                }}
                onOpenGlossary={() => g.setGlossaryOpen(true)}
              />
              <aside className="base-side">
                <div className="day-chip">
                  Day {g.state.day} / 10
                  <SourceBadge badge="ASSUMPTION" />
                  <span className="day-chip__power">
                    {g.powerToday} power today
                    <SourceBadge badge="ASSUMPTION" />
                  </span>
                </div>
                <ResourceBars state={g.state} />
                <WeatherCard weather={g.weather} commsOn={g.decisions.comms} />
                {g.todaysEvent ? (
                  <article className="mini-event">
                    <h3>Today&apos;s event</h3>
                    <p>{g.todaysEvent.title}</p>
                    <SourceBadge badge={g.todaysEvent.sourceBadge} />
                  </article>
                ) : null}
                <button type="button" className="btn primary wide" onClick={g.goPower}>
                  Assign today&apos;s power
                </button>
              </aside>
            </div>
          </section>
        ) : null}

        {g.phase === "power" && g.state ? (
          <PowerPanel
            state={g.state}
            powerPool={g.powerToday}
            decisions={g.decisions}
            onChange={g.setDecisions}
            onBack={() => g.setPhase("base")}
            onContinue={g.goEvent}
          />
        ) : null}

        {g.phase === "event" && g.todaysEvent ? (
          <EventCardView
            event={g.todaysEvent}
            onChoose={g.chooseEvent}
            onBack={() => g.setPhase("power")}
          />
        ) : null}

        {g.phase === "result" && g.lastResult ? (
          <DayResultView
            result={g.lastResult}
            deltas={g.deltas}
            notes={g.lastResult.dayLog.notes}
            onContinue={g.continueAfterResult}
          />
        ) : null}

        {g.phase === "end" && g.state ? (
          <section className="screen panel end-screen">
            <img
              src={g.lastResult?.won ? ART.novaGirlHelmet : ART.novaGirlGlasses}
              alt=""
              className="end-art bob"
            />
            <h2>{g.lastResult?.won ? "Mission complete!" : "Mission stopped"}</h2>
            <p>
              Science score: <strong>{g.state.science}</strong>{" "}
              <SourceBadge badge="ASSUMPTION" />
            </p>
            <p>
              Crew safety risk: <strong>{g.state.exposure.toFixed(1)}</strong>{" "}
              <SourceBadge badge="ASSUMPTION" />
            </p>
            <p>
              Seed {g.seed} · weather{" "}
              <SourceBadge badge={g.weather?.source ?? "ARCHIVED"} />
            </p>
            <ul className="end-log">
              {g.state.log.map((day) => (
                <li key={day.day}>
                  Day {day.day}: {day.eventId} → {day.choice} · science {day.science} ·
                  water {day.water}
                </li>
              ))}
            </ul>
            <div className="panel__actions">
              <button type="button" className="btn primary" onClick={g.replay}>
                Replay with a new seed
              </button>
              <button type="button" className="btn ghost" onClick={g.openLegend}>
                What is real?
              </button>
            </div>
          </section>
        ) : null}

        {g.phase === "legend" ? (
          <LegendScreen onBack={g.backFromLegend} />
        ) : null}
      </main>

      {g.afterStormOpen && g.schedule?.radiationStudy ? (
        <div className="drawer-backdrop" role="presentation" onClick={() => g.setAfterStormOpen(false)}>
          <aside className="drawer" role="dialog" aria-label="Why radiation matters" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>Why radiation matters</h2>
              <button type="button" className="btn ghost" onClick={() => g.setAfterStormOpen(false)}>
                Close
              </button>
            </header>
            <p>
              Study {g.schedule.radiationStudy.id}: {g.schedule.radiationStudy.finding}
            </p>
            <a href={g.schedule.radiationStudy.url} target="_blank" rel="noreferrer">
              Open study
            </a>
          </aside>
        </div>
      ) : null}

      <GlossaryDrawer open={g.glossaryOpen} onClose={() => g.setGlossaryOpen(false)} />

      <footer className="nova-foot">
        Real data from NASA. Not made or endorsed by NASA.
      </footer>
    </div>
  );
}
