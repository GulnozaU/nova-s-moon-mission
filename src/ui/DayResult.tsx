import type { ApplyDayResult, DayDecisions } from "../engine/types";
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
  decisions?: DayDecisions;
  choice?: "A" | "B" | null;
  onContinue: () => void;
  onOpenGlossary: () => void;
};

export function DayResultView({
  result,
  deltas,
  event,
  notes,
  decisions,
  choice,
  onContinue,
  onOpenGlossary,
}: Props) {
  const really = event
    ? plainTalk(event.realWorldNote)
    : "Your choices stacked for later days.";
  const trade = tradeOffStory(event, choice, decisions, deltas);
  const summary = `${trade} ${deltas
    .map((d) => `${d.label} ${d.before} to ${d.after}`)
    .join(". ")}`;

  return (
    <section className="panel day-result">
      <header className="panel__head">
        <img src={ART.iconCalendar} alt="" className="bob" />
        <div>
          <h2>Day {result.dayLog.day} — what your choice did</h2>
          <p>This is the trade-off. Nothing was free.</p>
        </div>
      </header>

      <div className="teach-block trade-result">
        <h3>Your trade-off today</h3>
        <p>
          <SpaceText text={trade} onOpenDrawer={onOpenGlossary} />
        </p>
      </div>

      <ReadAloudButton text={`${summary}. ${really}`} />

      <ul className="delta-list">
        {deltas.length === 0 ? (
          <li>Nothing big changed today.</li>
        ) : (
          deltas.map((d) => {
            const up = d.after > d.before;
            const same = d.after === d.before;
            return (
              <li key={d.key}>
                <span
                  className={
                    same ? "delta" : up ? "delta up" : "delta down"
                  }
                >
                  {same ? "·" : up ? "↑" : "↓"} {d.label}
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
        <h3>What really happens (NASA)</h3>
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
          Mission stop — water, air, or crew safety ran out. Try a different
          trade-off next run.
        </p>
      ) : null}
      {result.won ? (
        <p className="day-result__banner is-win" role="status">
          You finished the 10-day stay — by balancing hard choices!
        </p>
      ) : null}

      <div className="panel__actions">
        <button type="button" className="btn primary" onClick={onContinue}>
          {result.lost || result.won ? "See end report" : "Next day · new trade-offs"}
        </button>
      </div>
    </section>
  );
}

function tradeOffStory(
  event: Event | null,
  choice: "A" | "B" | null | undefined,
  decisions: DayDecisions | undefined,
  deltas: ResourceDelta[],
): string {
  const bits: string[] = [];

  if (decisions) {
    if (!decisions.recycler) {
      bits.push("You left the water cleaner off, so the crew drinks more water.");
    } else {
      bits.push("You powered the water cleaner to save water.");
    }
    if (decisions.greenhouse) {
      bits.push("You watered plants (extra oxygen) and spent tank water.");
    }
    if (decisions.scienceLevel > 0) {
      bits.push(
        `You sent ${decisions.scienceLevel} science walk(s) outside — more discovery, more risk.`,
      );
    } else {
      bits.push("You kept the crew inside for science — safer, less discovery.");
    }
  }

  if (event && choice) {
    const opt = choice === "A" ? event.optionA : event.optionB;
    bits.push(
      `For “${event.title}” you picked “${opt.label}”: ↑ ${plainTalk(opt.benefit)} · ↓ ${plainTalk(opt.cost)}.`,
    );
  }

  const water = deltas.find((d) => d.key === "water");
  const risk = deltas.find((d) => d.key === "exposure");
  if (water && water.after < water.before) {
    bits.push("Watch the water arrow — that cost lands now and matters later.");
  }
  if (risk && risk.after > risk.before) {
    bits.push("Crew risk went up. Storms make that stick.");
  }

  if (bits.length === 0) {
    return "Every job you turned on helped something and took power or water from something else.";
  }
  return bits.join(" ");
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
