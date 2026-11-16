import { useMemo, useState } from "react";
import type { ApplyDayResult } from "../../engine/types";
import type { GameState } from "../../types";
import { SCIENCE_SUCCESS_TARGET } from "../../engine/constants";
import { causeEffectFromLog, quizFromState } from "../../content/debrief";
import { rankFromState } from "../../content/rank";
import { SourceBadge } from "../SourceBadge";
import { ART } from "../art";
import { ReadAloudButton } from "./ReadAloudButton";
import { SpaceText } from "./SpaceText";

type Props = {
  state: GameState;
  result: ApplyDayResult | null;
  onReplay: () => void;
  onLegend: () => void;
};

export function EndReport({ state, result, onReplay, onLegend }: Props) {
  const won = Boolean(result?.won);
  const survived = Boolean(result?.survived);
  const rank = useMemo(() => rankFromState(state, won), [state, won]);
  const stories = useMemo(() => causeEffectFromLog(state), [state]);
  const quiz = useMemo(() => quizFromState(state, won), [state, won]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);

  const score = quiz.reduce((n, q) => {
    return n + (answers[q.id] === q.answerIndex ? 1 : 0);
  }, 0);

  const blurb = won
    ? `You succeeded! Science ${state.science} met the goal of ${SCIENCE_SUCCESS_TARGET}. Rank: ${rank.title}.`
    : survived
      ? `You lasted 10 days, but science ${state.science} is under the goal of ${SCIENCE_SUCCESS_TARGET}. Rank: ${rank.title}.`
      : `Mission stopped. Rank: ${rank.title}.`;

  return (
    <section className="panel end-report">
      <img
        src={won ? ART.novaGirlHelmet : ART.novaGirlGlasses}
        alt=""
        className="end-art bounce"
      />
      <h2>
        {won
          ? "Mission success!"
          : survived
            ? "Survived — science goal missed"
            : "Mission review"}
      </h2>
      <p className="rank-banner">
        Rank: <strong>{rank.title}</strong> <SourceBadge badge="ASSUMPTION" />
      </p>
      <p>
        Goal: last 10 days and earn at least {SCIENCE_SUCCESS_TARGET} science.{" "}
        <SourceBadge badge="ASSUMPTION" /> You have {state.science}.
      </p>
      <p>
        <SpaceText text={rank.why} />
      </p>
      <ReadAloudButton text={`${blurb} ${rank.why}`} />

      <h3>Where crew risk came from</h3>
      <ul className="ce-list">
        <li>
          <strong>No shields</strong>
          <span>
            → Without shields, the crew slowly takes more storm energy each day.
          </span>
        </li>
        <li>
          <strong>Storm outside</strong>
          <span>→ A storm hits much harder if the crew stays out.</span>
        </li>
        <li>
          <strong>Storm in shelter</strong>
          <span>→ Shelter cuts storm energy a lot, but science that day is 0.</span>
        </li>
        <li>
          <strong>Science walks</strong>
          <span>→ Walking outside for science adds a little risk.</span>
        </li>
        <li>
          <strong>Heat off</strong>
          <span>→ If heat has no power, the crew takes more storm energy.</span>
        </li>
      </ul>

      <h3>Cause and effect from your log</h3>
      <ul className="ce-list">
        {stories.map((s) => (
          <li key={`${s.day}-${s.cause}`}>
            <strong>{s.cause}</strong>
            <span>→ {s.effect}</span>
          </li>
        ))}
      </ul>

      <h3>Quick check (3 questions)</h3>
      <ol className="quiz-list">
        {quiz.map((q) => (
          <li key={q.id}>
            <p>{q.question}</p>
            <div className="predict-row">
              {q.choices.map((c, idx) => (
                <button
                  key={c}
                  type="button"
                  className={`tap-chip ${answers[q.id] === idx ? "is-on" : ""}`}
                  disabled={checked}
                  onClick={() => setAnswers({ ...answers, [q.id]: idx })}
                >
                  {c}
                </button>
              ))}
            </div>
            {checked ? (
              <small className={answers[q.id] === q.answerIndex ? "helps" : "costs"}>
                {answers[q.id] === q.answerIndex ? "Correct. " : "Not quite. "}
                {q.source}
              </small>
            ) : null}
          </li>
        ))}
      </ol>
      {!checked ? (
        <button
          type="button"
          className="btn primary"
          onClick={() => setChecked(true)}
          disabled={Object.keys(answers).length < quiz.length}
        >
          Check answers
        </button>
      ) : (
        <p className="helps">You got {score} / {quiz.length}.</p>
      )}

      <p>
        Science <strong>{state.science}</strong> · Crew safety risk{" "}
        <strong>{state.exposure.toFixed(1)}</strong>{" "}
        <SourceBadge badge="ASSUMPTION" />
      </p>

      <div className="panel__actions">
        <button type="button" className="btn primary" onClick={onReplay}>
          Try a different strategy
        </button>
              <button type="button" className="btn ghost" onClick={onLegend}>
                About the data
              </button>
      </div>
    </section>
  );
}
