import type { DayDecisions } from "../../engine/types";
import {
  COMMS_COST,
  GREENHOUSE_COST,
  HEAT_COST,
  OXYGEN_MAKER_COST,
  RECYCLER_COST,
  SCIENCE_COST_PER_LEVEL,
  SCIENCE_LEVEL_MAX,
  WATER_USE_WITHOUT_RECYCLER,
  WATER_USE_WITH_RECYCLER,
} from "../../engine/constants";
import { plannedPowerCost } from "../powerMath";
import { ART } from "../art";
import { SourceBadge } from "../SourceBadge";
import { SpaceText } from "./SpaceText";
import { ReadAloudButton } from "./ReadAloudButton";

type Props = {
  decisions: DayDecisions;
  powerToday: number;
  onDecisions: (d: DayDecisions | ((p: DayDecisions) => DayDecisions)) => void;
  onOpenGlossary: () => void;
  onReady: () => void;
  onVisitBase?: () => void;
};

/**
 * Core teaching UI: power is limited, so every job helps and costs.
 * Kids must leave something off — that is the trade-off.
 */
export function PowerTradePanel({
  decisions,
  powerToday,
  onDecisions,
  onOpenGlossary,
  onReady,
  onVisitBase,
}: Props) {
  const spent = plannedPowerCost(decisions);
  const left = powerToday - spent;
  const over = left < 0;

  const waterToday = decisions.recycler
    ? WATER_USE_WITH_RECYCLER + (decisions.oxygenMaker ? 1 : 0) + (decisions.greenhouse ? 2 : 0)
    : WATER_USE_WITHOUT_RECYCLER + (decisions.oxygenMaker ? 1 : 0) + (decisions.greenhouse ? 2 : 0);

  const lesson = over
    ? "Too many jobs! Turn something off. You cannot run everything — that is the real trade-off."
    : `You will use about ${waterToday} water today. Power left for the battery: ${Math.max(0, left)}.`;

  const chain =
    "Chain: power runs the water cleaner → cleaner saves water → water can make oxygen. Science walks use power and raise storm risk.";

  return (
    <section className="trade-panel" aria-label="Today's power trade-off">
      <header className="trade-panel__head">
        <p className="eyebrow">
          Today&apos;s trade-off <SourceBadge badge="ASSUMPTION" />
        </p>
        <h2>You only have {powerToday} power chips</h2>
        <p>
          <SpaceText
            text="Heat always takes 2. Everything else is a choice. Every ON helps and costs."
            onOpenDrawer={onOpenGlossary}
          />
        </p>
        <ReadAloudButton text={`${lesson} ${chain}`} />
      </header>

      <div className="trade-panel__budget" role="status">
        <span>
          Using <strong>{spent}</strong> / {powerToday}
        </span>
        <span className={over ? "is-bad" : "is-ok"}>
          {over ? "Over budget — turn something OFF" : `Left for battery: ${left}`}
        </span>
      </div>

      <div className="trade-chain">
        <SpaceText text={chain} onOpenDrawer={onOpenGlossary} />
      </div>

      <div className="trade-grid">
        <JobCard
          forced
          on
          icon={ART.iconSun}
          title="Heat"
          help="Crew stays warm"
          cost={`Always −${HEAT_COST} power`}
        />
        <JobCard
          on={decisions.recycler}
          icon={ART.iconWater}
          title="Water cleaner"
          help={`Drink −${WATER_USE_WITH_RECYCLER} water (not −${WATER_USE_WITHOUT_RECYCLER})`}
          cost={`−${RECYCLER_COST} power`}
          onClick={() => onDecisions({ ...decisions, recycler: !decisions.recycler })}
        />
        <JobCard
          on={decisions.oxygenMaker}
          icon={ART.iconLeaf}
          title="Air maker"
          help="+3 oxygen"
          cost={`−${OXYGEN_MAKER_COST} power and −1 water`}
          onClick={() =>
            onDecisions({ ...decisions, oxygenMaker: !decisions.oxygenMaker })
          }
        />
        <JobCard
          on={decisions.comms}
          icon={ART.dish}
          title="Talk to Earth"
          help="Full storm warning time"
          cost={`−${COMMS_COST} power (off = half warning)`}
          onClick={() => onDecisions({ ...decisions, comms: !decisions.comms })}
        />
        <JobCard
          on={Boolean(decisions.greenhouse)}
          icon={ART.greenhouseDome}
          title="Water the plants"
          help="+1 oxygen and +1 science"
          cost={`−${GREENHOUSE_COST} power and −2 water`}
          onClick={() =>
            onDecisions({ ...decisions, greenhouse: !decisions.greenhouse })
          }
        />
        <div className="job-card job-card--science">
          <img src={ART.rover} alt="" />
          <div>
            <strong>Science walks outside</strong>
            <span className="helps">↑ +science each walk</span>
            <span className="costs">
              ↓ −{SCIENCE_COST_PER_LEVEL} power each + a little storm risk
            </span>
            <div className="science-stepper">
              <button
                type="button"
                aria-label="Fewer walks"
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
                aria-label="More walks"
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
            </div>
          </div>
        </div>
      </div>

      <p className={`trade-lesson ${over ? "is-bad" : ""}`}>
        <SpaceText text={lesson} onOpenDrawer={onOpenGlossary} />
      </p>

      <div className="row-actions">
        {onVisitBase ? (
          <button type="button" className="btn ghost" onClick={onVisitBase}>
            See it on the base →
          </button>
        ) : null}
        <button
          type="button"
          className="btn primary pulse"
          disabled={over}
          onClick={onReady}
        >
          Lock plan · see today&apos;s choice →
        </button>
      </div>
    </section>
  );
}

function JobCard({
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
      <em>{forced ? "ALWAYS" : on ? "ON" : "off"}</em>
    </>
  );
  if (forced || !onClick) {
    return <div className={`job-card ${on ? "is-on" : ""} is-forced`}>{inner}</div>;
  }
  return (
    <button
      type="button"
      className={`job-card ${on ? "is-on" : ""}`}
      onClick={onClick}
    >
      {inner}
    </button>
  );
}
