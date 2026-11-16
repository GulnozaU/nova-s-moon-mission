import { useMemo } from "react";
import { audio } from "../audio/audio";
import { CardNasaImage } from "./CardNasaImage";
import { GlossaryDrawer } from "./GlossaryDrawer";
import { LegendScreen } from "./LegendScreen";
import { MuteButton } from "./MuteButton";
import { PhaserPlay } from "../game/PhaserPlay";
import { DepthWorldPlay } from "../depthScenes/DepthWorldPlay";
import { SourceBadge } from "./SourceBadge";
import { ART } from "./art";
import { getNasaImage } from "../content/images";
import { useGameSession } from "./useGameSession";
import { DialogueBox } from "./teach/DialogueBox";
import { EndReport } from "./teach/EndReport";
import { SpaceText } from "./teach/SpaceText";
import type { PlayMode } from "../game/bridge";
import "./game.css";

/** Default = depth-painting world. `?mode=2d` launches the Phaser game (branch main-2d). */
function playMode2d(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mode") === "2d";
}

/** One idea per screen — Nova says it; no duplicate body text. */
const TRAINING = [
  {
    art: ART.panels,
    nasaSlot: "title" as const,
    lines: [
      { text: "Hello! I am Nova." },
      { text: "You only get a few power chips each day." },
      { text: "Every job helps — and every job costs. Nothing is free." },
    ],
  },
  {
    art: ART.waterTower,
    nasaSlot: "greenhouse" as const,
    lines: [
      { text: "Power runs the water cleaner." },
      { text: "The cleaner saves water. Water can make oxygen." },
      { text: "If you skip the cleaner, tanks fall faster." },
    ],
  },
  {
    art: ART.iconSun,
    nasaSlot: "storm" as const,
    lines: [
      { text: "NASA watches real storms on the Sun." },
      { text: "Shelter keeps the crew safer — but you lose science that day." },
      { text: "Stay out for science — risk goes up. That is a trade-off." },
    ],
  },
];

export function GameApp() {
  const g = useGameSession();
  const dashMode: PlayMode = g.phase === "end" ? "ending" : "explore";
  /** Keep one play instance from Day 1 through the end report. */
  const missionLive = Boolean(g.state && g.weather && g.phase !== "welcome");
  const playVisible = g.phase === "base";
  const use2d = useMemo(() => playMode2d(), []);

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
        <button
          type="button"
          className="brand"
          onClick={() => {
            audio.play("uiClick");
            g.setPhase("welcome");
          }}
          onMouseEnter={() => audio.play("uiHover")}
        >
          <img src={ART.nova} alt="" />
          <span>Nova&apos;s Moon Mission</span>
        </button>
        <nav>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              audio.play("uiClick");
              g.setGlossaryOpen(true);
            }}
            onMouseEnter={() => audio.play("uiHover")}
          >
            Space words
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              audio.play("uiClick");
              g.openLegend();
            }}
            onMouseEnter={() => audio.play("uiHover")}
          >
            About the data
          </button>
          <MuteButton />
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
                  { text: "Help me run this Moon base. Every choice helps — and costs." },
                ]}
                onDone={() => {
                  // First gesture unlocks Web Audio (browsers require a click).
                  audio.unlock();
                  audio.play("dayStart");
                  g.startTraining();
                }}
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
                    onClick={() => {
                      audio.unlock();
                      audio.play("uiClick");
                      void g.pickSite(site.id as "rim" | "plain");
                    }}
                    onMouseEnter={() => audio.play("uiHover")}
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

        {missionLive && g.state && g.weather ? (
          use2d ? (
            <PhaserPlay
              state={g.state}
              weather={g.weather}
              event={g.todaysEvent}
              decisions={g.decisions}
              powerToday={g.powerToday}
              mode={dashMode}
              deltas={g.deltas}
              stormAlerts={g.stormAlerts}
              tomorrowHint={g.tomorrowHint}
              commsYesterday={g.commsYesterday}
              novaLine={g.novaLine}
              sheltering={g.sheltering}
              osdrStudy={g.greenhouseStudy}
              visible={playVisible}
              onDecisions={g.setDecisions}
              onNovaLine={g.setNovaLine}
              onSheltering={g.setSheltering}
              onEndDay={g.endDayFromWorld}
              onContinueAfterResult={g.continueAfterResult}
              onOpenGlossary={() => g.setGlossaryOpen(true)}
            />
          ) : (
            <DepthWorldPlay
              state={g.state}
              weather={g.weather}
              event={g.todaysEvent}
              decisions={g.decisions}
              powerToday={g.powerToday}
              mode={dashMode}
              deltas={g.deltas}
              stormAlerts={g.stormAlerts}
              tomorrowHint={g.tomorrowHint}
              commsYesterday={g.commsYesterday}
              novaLine={g.novaLine}
              sheltering={g.sheltering}
              osdrStudy={g.greenhouseStudy}
              visible={playVisible}
              onDecisions={g.setDecisions}
              onNovaLine={g.setNovaLine}
              onSheltering={g.setSheltering}
              onEndDay={g.endDayFromWorld}
              onContinueAfterResult={g.continueAfterResult}
              onOpenGlossary={() => g.setGlossaryOpen(true)}
            />
          )
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
