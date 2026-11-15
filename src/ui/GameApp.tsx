import { CardNasaImage } from "./CardNasaImage";
import { DayResultView } from "./DayResult";
import { GlossaryDrawer } from "./GlossaryDrawer";
import { LegendScreen } from "./LegendScreen";
import { PhaserPlay } from "../game/PhaserPlay";
import { SourceBadge } from "./SourceBadge";
import { ART } from "./art";
import { getNasaImage } from "../content/images";
import { useGameSession } from "./useGameSession";
import { DialogueBox } from "./teach/DialogueBox";
import { EndReport } from "./teach/EndReport";
import { SpaceText } from "./teach/SpaceText";
import "./game.css";

/** One idea per screen — Nova says it; no duplicate body text. */
const TRAINING = [
  {
    art: ART.panels,
    nasaSlot: "title" as const,
    lines: [
      { text: "Hello! I am Nova." },
      { text: "You will walk me around the Moon base." },
      { text: "Use arrows or WASD. Press SPACE near doors and tools." },
    ],
  },
  {
    art: ART.waterTower,
    nasaSlot: "greenhouse" as const,
    lines: [
      { text: "Water and air can run out." },
      { text: "The water cleaner saves water." },
      { text: "The air maker needs power too." },
    ],
  },
  {
    art: ART.iconSun,
    nasaSlot: "storm" as const,
    lines: [
      { text: "Space weather can hurt the crew." },
      { text: "NASA watches storms on the Sun." },
      { text: "Shelter helps when storms arrive." },
    ],
  },
];

export function GameApp() {
  const g = useGameSession();
  const dashMode =
    g.phase === "power" ? "power" : g.phase === "event" ? "choose" : "explore";

  const advanceTraining = () => {
    if (g.trainingStep >= TRAINING.length - 1) g.setPhase("site");
    else g.setTrainingStep(g.trainingStep + 1);
  };

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
            About the data
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
              <CardNasaImage slot="title" className="welcome-hero__nasa" />
            </div>
            <div className="welcome-copy">
              <h1>Can you help Nova for 10 days?</h1>
              <DialogueBox
                lines={[
                  { text: "Hello! I am Nova." },
                  { text: "Walk me around the base — grab tools, water plants, run machines!" },
                ]}
                onDone={g.startTraining}
              />
            </div>
          </section>
        ) : null}

        {g.phase === "training" ? (
          <section className="screen training-lesson">
            <p className="eyebrow">
              Training Day · {g.trainingStep + 1} / {TRAINING.length}
            </p>
            <div className="training-lesson__stage">
              <img
                src={TRAINING[g.trainingStep]!.art}
                alt=""
                className="training-lesson__art bob"
              />
              <CardNasaImage
                slot={TRAINING[g.trainingStep]!.nasaSlot}
                className="training-lesson__nasa"
              />
            </div>
            <DialogueBox
              key={g.trainingStep}
              lines={TRAINING[g.trainingStep]!.lines}
              onDone={advanceTraining}
            />
            {g.trainingStep > 0 ? (
              <button
                type="button"
                className="btn ghost"
                onClick={() => g.setTrainingStep(g.trainingStep - 1)}
              >
                Back
              </button>
            ) : null}
          </section>
        ) : null}

        {g.phase === "site" ? (
          <section className="screen site-screen">
            <h2>Where should Nova build?</h2>
            <p>
              <SpaceText
                text="Each place has a trade-off. Read both sides."
                onOpenDrawer={() => g.setGlossaryOpen(true)}
              />
            </p>
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
                    <p>
                      {site.id === "rim"
                        ? "Sunny almost every day"
                        : "Dark for half the time"}
                    </p>
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
                    <details className="how-know">
                      <summary>How do we know?</summary>
                      <p>
                        Picture {nasa.id}. Sunlight rule is a game ASSUMPTION for this
                        short mission.
                      </p>
                    </details>
                    <SourceBadge badge="ASSUMPTION" />
                    <span className="btn primary">Build here</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {g.phase === "loading" ? (
          <section className="screen panel loading-screen" aria-busy="true">
            <img src={ART.rover} alt="" className="drive" />
            <h2>Loading space weather…</h2>
            <p>Fetching storm notes and plant studies. No login.</p>
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
          <PhaserPlay
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
          />
        ) : null}

        {g.phase === "result" && g.lastResult ? (
          <DayResultView
            result={g.lastResult}
            deltas={g.deltas}
            event={g.todaysEvent}
            notes={g.lastResult.dayLog.notes}
            onContinue={g.continueAfterResult}
            onOpenGlossary={() => g.setGlossaryOpen(true)}
          />
        ) : null}

        {g.phase === "end" && g.state ? (
          <EndReport
            state={g.state}
            result={g.lastResult}
            onReplay={g.replay}
            onLegend={g.openLegend}
          />
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
            <CardNasaImage slot="storm" />
            <p>
              <SpaceText
                text={`Scientists studied plants in study ${g.schedule.radiationStudy.id}. ${g.schedule.radiationStudy.finding}`}
                onOpenDrawer={() => g.setGlossaryOpen(true)}
              />
            </p>
            <details className="how-know">
              <summary>How do we know?</summary>
              <a
                href={g.schedule.radiationStudy.url}
                target="_blank"
                rel="noreferrer"
              >
                Open study {g.schedule.radiationStudy.id}
              </a>
            </details>
          </aside>
        </div>
      ) : null}

      <GlossaryDrawer open={g.glossaryOpen} onClose={() => g.setGlossaryOpen(false)} />
    </div>
  );
}
