import {
  COMMS_COST,
  GREENHOUSE_COST,
  HEAT_COST,
  OXYGEN_MAKER_COST,
  PANEL_MATERIAL_COST,
  RECYCLER_COST,
  SCIENCE_COST_PER_LEVEL,
  SCIENCE_LEVEL_MAX,
  SHIELD_MATERIAL_COST,
} from "../engine/constants";
import type { DayDecisions } from "../engine/types";
import type { GameState } from "../types";
import { SourceBadge } from "./SourceBadge";
import { ART } from "./art";
import { plannedPowerCost } from "./powerMath";

type Props = {
  state: GameState;
  powerPool: number;
  decisions: DayDecisions;
  onChange: (next: DayDecisions) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function PowerPanel({
  state,
  powerPool,
  decisions,
  onChange,
  onContinue,
  onBack,
}: Props) {
  const spent = plannedPowerCost(decisions);
  const left = powerPool - spent;

  const toggle = (key: keyof DayDecisions, value?: boolean | number) => {
    if (key === "scienceLevel") {
      onChange({ ...decisions, scienceLevel: value as number });
      return;
    }
    onChange({ ...decisions, [key]: value });
  };

  const canAfford = (extra: number) => left + 0 >= extra || spent + extra <= powerPool;

  return (
    <section className="panel power-panel">
      <header className="panel__head">
        <img src={ART.iconZap} alt="" className="bob" />
        <div>
          <h2>You have {powerPool} power</h2>
          <p>
            Heat always uses {HEAT_COST}. Tap what to turn on.{" "}
            <SourceBadge badge="ASSUMPTION" />
          </p>
        </div>
      </header>

      <p className="power-panel__pool">
        Using <strong>{spent}</strong> · Left for battery{" "}
        <strong>{Math.max(0, left)}</strong>
      </p>

      <ul className="power-toggles">
        <li className="is-forced">
          <img src={ART.iconSun} alt="" />
          <div>
            <strong>Heat</strong>
            <span>Always on · costs {HEAT_COST}</span>
          </div>
          <em>On</em>
        </li>
        <li>
          <button
            type="button"
            className={decisions.recycler ? "is-on" : ""}
            onClick={() => toggle("recycler", !decisions.recycler)}
          >
            <img src={ART.iconWater} alt="" />
            <div>
              <strong>Water cleaner</strong>
              <span>Costs {RECYCLER_COST} · saves water</span>
            </div>
            <em>{decisions.recycler ? "On" : "Off"}</em>
          </button>
        </li>
        <li>
          <button
            type="button"
            className={decisions.oxygenMaker ? "is-on" : ""}
            onClick={() => toggle("oxygenMaker", !decisions.oxygenMaker)}
          >
            <img src={ART.iconLeaf} alt="" />
            <div>
              <strong>Air maker</strong>
              <span>Costs {OXYGEN_MAKER_COST} · needs a little water</span>
            </div>
            <em>{decisions.oxygenMaker ? "On" : "Off"}</em>
          </button>
        </li>
        <li>
          <button
            type="button"
            className={decisions.comms ? "is-on" : ""}
            onClick={() => toggle("comms", !decisions.comms)}
          >
            <img src={ART.dish} alt="" />
            <div>
              <strong>Talk to Earth</strong>
              <span>Costs {COMMS_COST} · better storm warning</span>
            </div>
            <em>{decisions.comms ? "On" : "Off"}</em>
          </button>
        </li>
        <li>
          <button
            type="button"
            className={decisions.greenhouse ? "is-on" : ""}
            onClick={() => toggle("greenhouse", !decisions.greenhouse)}
          >
            <img src={ART.greenhouseDome} alt="" />
            <div>
              <strong>Greenhouse</strong>
              <span>Costs {GREENHOUSE_COST} power + water</span>
            </div>
            <em>{decisions.greenhouse ? "On" : "Off"}</em>
          </button>
        </li>
      </ul>

      <div className="science-stepper">
        <span>Science work outside</span>
        <div>
          <button
            type="button"
            aria-label="Less science"
            onClick={() =>
              toggle("scienceLevel", Math.max(0, decisions.scienceLevel - 1))
            }
          >
            −
          </button>
          <strong>
            {decisions.scienceLevel} / {SCIENCE_LEVEL_MAX}
          </strong>
          <button
            type="button"
            aria-label="More science"
            disabled={!canAfford(SCIENCE_COST_PER_LEVEL) && decisions.scienceLevel >= SCIENCE_LEVEL_MAX}
            onClick={() =>
              toggle(
                "scienceLevel",
                Math.min(SCIENCE_LEVEL_MAX, decisions.scienceLevel + 1),
              )
            }
          >
            +
          </button>
        </div>
        <small>
          {SCIENCE_COST_PER_LEVEL} power each · <SourceBadge badge="ASSUMPTION" />
        </small>
      </div>

      <div className="build-row">
        <button
          type="button"
          className={decisions.buildShield ? "is-on" : ""}
          disabled={state.materials < SHIELD_MATERIAL_COST}
          onClick={() => toggle("buildShield", !decisions.buildShield)}
        >
          <img src={ART.iconShield} alt="" />
          Build shield ({SHIELD_MATERIAL_COST} parts)
        </button>
        <button
          type="button"
          className={decisions.buildPanel ? "is-on" : ""}
          disabled={state.materials < PANEL_MATERIAL_COST}
          onClick={() => toggle("buildPanel", !decisions.buildPanel)}
        >
          <img src={ART.panels} alt="" />
          Build panel ({PANEL_MATERIAL_COST} parts)
        </button>
      </div>

      {left < 0 ? (
        <p className="power-panel__warn" role="alert">
          Too many things are on. Turn some off — you only have {powerPool} power.
        </p>
      ) : null}

      <div className="panel__actions">
        <button type="button" className="btn ghost" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={left < 0}
          onClick={onContinue}
        >
          See today&apos;s event
        </button>
      </div>
    </section>
  );
}
