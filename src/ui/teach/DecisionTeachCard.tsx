import { useMemo, useState } from "react";
import type { Event } from "../../types";
import { plainTalk } from "../../content/banned";
import { nasaImageForContext } from "../../content/imageForContext";
import { CardNasaImage } from "../CardNasaImage";
import { SourceBadge } from "../SourceBadge";
import { AskNova } from "./AskNova";
import { CostChips } from "./CostChips";
import { ReadAloudButton } from "./ReadAloudButton";
import { SpaceText } from "./SpaceText";

type Props = {
  event: Event;
  onConfirm: (choice: "A" | "B") => void;
  onBack: () => void;
  onOpenGlossary: () => void;
};

type Step = "story" | "options" | "predict" | "preview";

/**
 * Decision card: What / Why / Options / optional Predict / confirm with chips.
 * Result + "What really happens" show on the day-result screen after applyDay.
 */
export function DecisionTeachCard({
  event,
  onConfirm,
  onBack,
  onOpenGlossary,
}: Props) {
  const [step, setStep] = useState<Step>("story");
  const [picked, setPicked] = useState<"A" | "B" | null>(null);
  const [predict, setPredict] = useState<string>("");

  const happening = plainTalk(event.explanation);
  const why = useMemo(() => whyItMatters(event), [event]);
  const really = plainTalk(event.realWorldNote);
  const readText = `${happening} ${why}`;
  const photo =
    event.image ??
    (() => {
      const img = nasaImageForContext(event.id);
      return {
        slot: img.slot,
        nasaId: img.id,
        src: img.file,
        alt: img.alt,
        credit: img.credit,
        pageUrl: img.pageUrl,
      };
    })();

  return (
    <section className="paper-card teach-card">
      <header className="teach-card__head">
        <p className="eyebrow">
          Decision <SourceBadge badge={event.sourceBadge} />
        </p>
        <h2>{event.title}</h2>
        <div className="teach-card__tools">
          <ReadAloudButton text={readText} />
          <AskNova event={event} />
        </div>
      </header>

      <CardNasaImage image={photo} className="teach-card__photo" />

      {step === "story" ? (
        <div className="teach-block">
          <h3>1. What is happening</h3>
          <p>
            <SpaceText text={happening} onOpenDrawer={onOpenGlossary} />
          </p>
          <h3>2. Why it matters</h3>
          <p>
            <SpaceText text={why} onOpenDrawer={onOpenGlossary} />
          </p>
          <details className="how-know">
            <summary>How do we know?</summary>
            <p>{really}</p>
          </details>
          <button type="button" className="btn primary" onClick={() => setStep("options")}>
            See options →
          </button>
        </div>
      ) : null}

      {step === "options" ? (
        <div className="teach-block">
          <h3>3. Your options</h3>
          <p className="muted">Tap one to preview what it adds and takes.</p>
          <div className="trade-options">
            <button
              type="button"
              className={`trade-btn ${picked === "A" ? "is-picked" : ""}`}
              onClick={() => {
                setPicked("A");
                setStep("predict");
              }}
            >
              <strong>{event.optionA.label}</strong>
              <span className="helps">↑ Helps: {plainTalk(event.optionA.benefit)}</span>
              <span className="costs">↓ Costs: {plainTalk(event.optionA.cost)}</span>
            </button>
            <button
              type="button"
              className={`trade-btn ${picked === "B" ? "is-picked" : ""}`}
              onClick={() => {
                setPicked("B");
                setStep("predict");
              }}
            >
              <strong>{event.optionB.label}</strong>
              <span className="helps">↑ Helps: {plainTalk(event.optionB.benefit)}</span>
              <span className="costs">↓ Costs: {plainTalk(event.optionB.cost)}</span>
            </button>
          </div>
          <button type="button" className="btn ghost" onClick={() => setStep("story")}>
            Back
          </button>
        </div>
      ) : null}

      {step === "predict" && picked ? (
        <div className="teach-block">
          <h3>4. Predict (optional)</h3>
          <p>What do you think happens to your water?</p>
          <div className="predict-row">
            {["Goes up", "Goes down", "Stays about the same"].map((p) => (
              <button
                key={p}
                type="button"
                className={`tap-chip ${predict === p ? "is-on" : ""}`}
                onClick={() => setPredict(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn primary"
            onClick={() => setStep("preview")}
          >
            {predict ? "Preview cost →" : "Skip predict →"}
          </button>
          <button type="button" className="btn ghost" onClick={() => setStep("options")}>
            Back
          </button>
        </div>
      ) : null}

      {step === "preview" && picked ? (
        <div className="teach-block">
          <h3>Cost preview</h3>
          <p>
            You picked <strong>{picked === "A" ? event.optionA.label : event.optionB.label}</strong>
            {predict ? ` · You guessed water: ${predict}` : null}
          </p>
          <CostChips option={picked === "A" ? event.optionA : event.optionB} />
          <div className="row-actions">
            <button type="button" className="btn ghost" onClick={() => setStep("options")}>
              Pick again
            </button>
            <button
              type="button"
              className="btn primary pulse"
              onClick={() => onConfirm(picked)}
            >
              Confirm choice
            </button>
          </div>
        </div>
      ) : null}

      <button type="button" className="btn ghost" onClick={onBack}>
        Back to power
      </button>
    </section>
  );
}

function whyItMatters(event: Event): string {
  if (event.id === "solar-storm") {
    return "Storm energy can hurt people. Your choice changes crew safety today.";
  }
  if (event.id === "lunar-dust") {
    return "Dust can clog the water cleaner. That changes how fast tanks fall.";
  }
  if (event.id === "greenhouse-experiment") {
    return "Plants need water now. Saving water means less plant help today.";
  }
  if (event.id === "delayed-message") {
    return "Waiting for Earth uses power. Deciding alone can risk parts.";
  }
  return "This choice changes your supplies or safety for later days.";
}
