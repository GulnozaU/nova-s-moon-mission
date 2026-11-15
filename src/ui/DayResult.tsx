import type { ApplyDayResult } from "../engine/types";
import type { ResourceDelta } from "./useGameSession";
import { SourceBadge } from "./SourceBadge";
import { ART } from "./art";

type Props = {
  result: ApplyDayResult;
  deltas: ResourceDelta[];
  notes: string[];
  onContinue: () => void;
};

export function DayResultView({ result, deltas, notes, onContinue }: Props) {
  return (
    <section className="panel day-result">
      <header className="panel__head">
        <img src={ART.iconCalendar} alt="" className="bob" />
        <div>
          <h2>Day {result.dayLog.day} result</h2>
          <p>Here is what changed and why.</p>
        </div>
      </header>

      <ul className="delta-list">
        {deltas.length === 0 ? (
          <li>Nothing big changed today.</li>
        ) : (
          deltas.map((d) => {
            const up = d.after > d.before;
            const arrow = up ? "↑" : "↓";
            return (
              <li key={d.key}>
                <span className={up ? "delta up" : "delta down"}>
                  {arrow} {d.label}
                </span>
                <strong>
                  {fmt(d.before)} → {fmt(d.after)}
                </strong>
                <small>
                  {d.why} <SourceBadge badge={d.badge} />
                </small>
              </li>
            );
          })
        )}
      </ul>

      {notes.length > 0 ? (
        <details className="day-result__notes">
          <summary>How do we know?</summary>
          <ul>
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {result.lost ? (
        <p className="day-result__banner is-lose" role="status">
          Mission stop — water, air, or crew safety ran out.
        </p>
      ) : null}
      {result.won ? (
        <p className="day-result__banner is-win" role="status">
          You finished the 10-day stay!
        </p>
      ) : null}

      <div className="panel__actions">
        <button type="button" className="btn primary" onClick={onContinue}>
          {result.lost || result.won ? "See end report" : "Next day"}
        </button>
      </div>
    </section>
  );
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
