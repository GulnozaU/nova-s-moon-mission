import { CardNasaImage } from "./CardNasaImage";
import { DayResultView } from "./DayResult";
import { GlossaryDrawer } from "./GlossaryDrawer";
import { LegendScreen } from "./LegendScreen";
import { MissionDashboard } from "./MissionDashboard";
import { SourceBadge } from "./SourceBadge";
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
    title: "Every choice has a trade-off",
    body: "One button helps. The other costs. Read both before you tap.",
    art: ART.iconShield,
  },
  {
    title: "Storms are real",
    body: "NASA watches the Sun. A storm day can hurt if you stay outside.",
    art: ART.iconSun,
  },
];

export function GameApp() {
  const g = useGameSession();
  const dashMode =
    g.phase === "power" ? "power" : g.phase === "event" ? "choose" : "explore";

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
            <div
              className="welcome-hero"
              style={{ backgroundImage: `url(${ART.lunarSurface})` }}
            >
              <img
                src={ART.nova}
                alt="Nova the young astronaut"
                className="welcome-hero__nova bounce"
              />
              <img src={ART.rover} alt="" className="actor actor--rover drive" style={{ position: "absolute" }} />
              <CardNasaImage slot="title" className="welcome-hero__nasa" />
            </div>
            <div className="welcome-copy">
              <p className="eyebrow">Real data from NASA</p>
              <h1>Help Nova run a Moon base for 10 days</h1>
              <p>
                Watch the base move. Spend power. Then pick a choice where both the
                help and the cost are written out loud.
              </p>
              <div className="panel__actions">
                <button type="button" className="btn primary pulse" onClick={g.startTraining}>
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
            <p>Each place has a written trade-off. Pick one.</p>
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
                      {site.id === "rim" ? (
                        <>
                          <span className="helps">↑ Helps: steadier power</span>
                          <span className="costs">↓ Costs: less science each walk</span>
                        </>
                      ) : (
                        <>
                          <span className="helps">↑ Helps: more science</span>
                          <span className="costs">↓ Costs: dark nights, little power</span>
                        </>
                      )}
                    </p>
                    <SourceBadge badge="ASSUMPTION" />
                    <span className="btn primary">Build here · {nasa.id}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {g.phase === "loading" ? (
          <section className="screen panel loading-screen" aria-busy="true">
            <img src={ART.rover} alt="" className="drive" />
            <h2>Talking to NASA data…</h2>
            <p>Loading space weather and plant studies. No login.</p>
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

        {(g.phase === "base" || g.phase === "power" || g.phase === "event") &&
        g.state &&
        g.weather ? (
          <MissionDashboard
            state={g.state}
            weather={g.weather}
            event={g.todaysEvent}
            decisions={g.decisions}
            powerToday={g.powerToday}
            mode={dashMode}
            onDecisions={g.setDecisions}
            onPlanPower={g.goPower}
            onReadyForEvent={g.goEvent}
            onChoose={g.chooseEvent}
            onOpenGlossary={() => g.setGlossaryOpen(true)}
            onBackExplore={() =>
              g.setPhase(g.phase === "event" ? "power" : "base")
            }
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
              className="end-art bounce"
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
            <ul className="end-log">
              {g.state.log.map((day) => (
                <li key={day.day}>
                  Day {day.day}: {day.eventId} → {day.choice} · science {day.science}
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

        {g.phase === "legend" ? <LegendScreen onBack={g.backFromLegend} /> : null}
      </main>

      {g.afterStormOpen && g.schedule?.radiationStudy ? (
        <div
          className="drawer-backdrop"
          role="presentation"
          onClick={() => g.setAfterStormOpen(false)}
        >
          <aside
            className="drawer"
            role="dialog"
            aria-label="Why radiation matters"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <h2>Why radiation matters</h2>
              <button
                type="button"
                className="btn ghost"
                onClick={() => g.setAfterStormOpen(false)}
              >
                Close
              </button>
            </header>
            <p>
              Study {g.schedule.radiationStudy.id}:{" "}
              {g.schedule.radiationStudy.finding}
            </p>
            <a
              href={g.schedule.radiationStudy.url}
              target="_blank"
              rel="noreferrer"
            >
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
