import { useMemo, useState } from "react";
import type { Event, EventOption } from "../../types";
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
  day?: number;
  onConfirm: (choice: "A" | "B") => void;
  onBack: () => void;
  onOpenGlossary: () => void;
};

type Step = "story" | "pick";

/**
 * Kid-clear decision: story → pick A/B with different trade-offs.
 */
export function DecisionTeachCard({
  event,
  day = 1,
  onConfirm,
  onBack,
  onOpenGlossary,
}: Props) {
  const [step, setStep] = useState<Step>("story");
  const [picked, setPicked] = useState<"A" | "B" | null>(null);

  const happening = plainTalk(event.explanation);
  const why = useMemo(() => whyItMatters(event), [event]);
  const really = plainTalk(event.realWorldNote);
  const frames = useMemo(() => choiceFrames(event), [event]);
  const readText = `${happening} ${why}`;
  const photo =
    event.image ??
    (() => {
      const img = nasaImageForContext(event.id, day);
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
          Today&apos;s choice — A and B are different <SourceBadge badge={event.sourceBadge} />
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
          <h3>What happened?</h3>
          <p>
            <SpaceText text={happening} onOpenDrawer={onOpenGlossary} />
          </p>
          <h3>Why care?</h3>
          <p>
            <SpaceText text={why} onOpenDrawer={onOpenGlossary} />
          </p>
          <details className="how-know">
            <summary>How do we know?</summary>
            <p>{really}</p>
          </details>
          <button type="button" className="btn primary" onClick={() => setStep("pick")}>
            Compare A vs B →
          </button>
        </div>
      ) : null}

      {step === "pick" ? (
        <div className="teach-block">
          <h3>Pick one path</h3>
          <p className="muted">
            They are not the same. Green path vs careful path — read both.
          </p>
          <div className="trade-options">
            <ChoiceButton
              option={event.optionA}
              frame={frames.a}
              picked={picked === "A"}
              onPick={() => setPicked("A")}
            />
            <ChoiceButton
              option={event.optionB}
              frame={frames.b}
              picked={picked === "B"}
              onPick={() => setPicked("B")}
            />
          </div>
          {picked ? (
            <>
              <p>
                You chose{" "}
                <strong>
                  {picked === "A" ? frames.a.tag : frames.b.tag}:{" "}
                  {picked === "A" ? event.optionA.label : event.optionB.label}
                </strong>
              </p>
              <CostChips option={picked === "A" ? event.optionA : event.optionB} />
              <div className="row-actions">
                <button type="button" className="btn ghost" onClick={() => setPicked(null)}>
                  Pick again
                </button>
                <button
                  type="button"
                  className="btn primary pulse"
                  onClick={() => onConfirm(picked)}
                >
                  Do this!
                </button>
              </div>
            </>
          ) : null}
          <button type="button" className="btn ghost" onClick={() => setStep("story")}>
            Back
          </button>
        </div>
      ) : null}

      <button type="button" className="btn ghost" onClick={onBack}>
        Back to jobs
      </button>
    </section>
  );
}

function ChoiceButton({
  option,
  frame,
  picked,
  onPick,
}: {
  option: EventOption;
  frame: { tag: string; kind: "safe" | "risky" };
  picked: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className={`trade-btn trade-btn--${frame.kind} ${picked ? "is-picked" : ""}`}
      onClick={onPick}
    >
      <strong>
        {frame.tag}: {option.label}
      </strong>
      <span className="helps">↑ Helps: {plainTalk(option.benefit)}</span>
      <span className="costs">↓ Costs: {plainTalk(option.cost)}</span>
    </button>
  );
}

function choiceFrames(event: Event): {
  a: { tag: string; kind: "safe" | "risky" };
  b: { tag: string; kind: "safe" | "risky" };
} {
  if (event.id === "solar-storm") {
    return {
      a: { tag: "Safer path", kind: "safe" },
      b: { tag: "Riskier path", kind: "risky" },
    };
  }
  if (event.id === "lunar-dust") {
    return {
      a: { tag: "Fix it now", kind: "safe" },
      b: { tag: "Save stuff now", kind: "risky" },
    };
  }
  if (event.id === "greenhouse-experiment") {
    return {
      a: { tag: "Help plants", kind: "safe" },
      b: { tag: "Save water", kind: "risky" },
    };
  }
  if (event.id === "delayed-message") {
    return {
      a: { tag: "Ask Earth", kind: "safe" },
      b: { tag: "Decide alone", kind: "risky" },
    };
  }
  if (event.id === "battery-surge") {
    return {
      a: { tag: "Spend now", kind: "risky" },
      b: { tag: "Save power", kind: "safe" },
    };
  }
  if (event.id === "supply-drop") {
    return {
      a: { tag: "Take supplies", kind: "safe" },
      b: { tag: "Keep science", kind: "risky" },
    };
  }
  return {
    a: { tag: "Choice A", kind: "safe" },
    b: { tag: "Choice B", kind: "risky" },
  };
}

function whyItMatters(event: Event): string {
  if (event.id === "solar-storm") {
    return "One path keeps the crew safer. The other path risks more hurt for other gains.";
  }
  if (event.id === "lunar-dust") {
    return "Cleaning costs materials now. Skipping means the water cleaner stays weak.";
  }
  if (event.id === "greenhouse-experiment") {
    return "Watering plants uses tank water. Saving water means dry plants and less oxygen today.";
  }
  if (event.id === "delayed-message") {
    return "Asking Earth spends power. Deciding alone might break parts.";
  }
  if (event.id === "battery-surge") {
    return "Spend power for science now, or store power for a darker day.";
  }
  return "Each path changes supplies or safety in a different way.";
}
