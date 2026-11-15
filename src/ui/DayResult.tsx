import type { ApplyDayResult } from "../engine/types";
import type { Event } from "../types";
import type { ResourceDelta } from "./useGameSession";
import { plainTalk } from "../content/banned";
import { SourceBadge } from "./SourceBadge";
import { ART } from "./art";
import { ReadAloudButton } from "./teach/ReadAloudButton";
import { SpaceText } from "./teach/SpaceText";

type Props = {
  result: ApplyDayResult;
  deltas: ResourceDelta[];
  event: Event | null;
  notes: string[];
  onContinue: () => void;
  onOpenGlossary: () => void;
};

export function DayResultView({
  result,
  deltas,
  event,
  notes,
  onContinue,
  onOpenGlossary,
}: Props) {
  const really = event ? plainTalk(event.realWorldNote) : "Your choices stacked for later days.";
  const summary = deltas
    .map((d) => `${d.label} ${d.before} to ${d.after}`)
    .join(". ");

  return (
    <section className="panel day-result">
      <header className="panel__head">
        <img src={ART.iconCalendar} alt="" className="bob" />
        <div>
          <h2>5. Day {result.dayLog.day} result</h2>
          <p>Arrows show what changed and why.</p>
        </div>
      </header>

      <ReadAloudButton text={`${summary}. ${really}`} />

      <ul className="delta-list">
        {deltas.length === 0 ? (
          <li>Nothing big changed today.</li>
        ) : (
          deltas.map((d) => {
            const up = d.after > d.before;
            return (
              <li key={d.key}>
                <span className={up ? "delta up" : "delta down"}>
                  {up ? "↑" : "↓"} {d.label}
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

      <div className="teach-block really-box">
        <h3>6. What really happens</h3>
        <p>
          <SpaceText text={really} onOpenDrawer={onOpenGlossary} />
        </p>
      </div>

      {notes.length > 0 ? (
        <details className="how-know">
          <summary>How do we know?</summary>
          <ul>
            {notes.map((n) => (
              <li key={n}>{plainTalk(n)}</li>
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
