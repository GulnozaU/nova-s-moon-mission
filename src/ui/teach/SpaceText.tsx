import { useMemo, useState } from "react";
import {
  getGlossaryTerm,
  glossaryMatchTerms,
  type GlossaryEntry,
} from "../../content/glossary";

type Props = {
  text: string;
  onOpenDrawer?: () => void;
};

/**
 * Underline Space Words; tap for ≤15-word definition + picture (SPEC 6c).
 */
export function SpaceText({ text, onOpenDrawer }: Props) {
  const [active, setActive] = useState<GlossaryEntry | null>(null);
  const parts = useMemo(() => splitWithTerms(text), [text]);

  return (
    <span className="space-text">
      {parts.map((part, idx) => {
        if (part.type === "text") {
          return <span key={idx}>{part.value}</span>;
        }
        const entry = getGlossaryTerm(part.value);
        if (!entry) return <span key={idx}>{part.value}</span>;
        return (
          <button
            key={idx}
            type="button"
            className="space-word"
            onClick={() => setActive(entry)}
          >
            {part.value}
          </button>
        );
      })}
      {active ? (
        <span className="space-pop" role="dialog" aria-label={active.term}>
          <img src={active.pictureSrc} alt="" />
          <strong>{active.term}</strong>
          <em>{active.definition}</em>
          <span className="space-pop__actions">
            <button type="button" className="btn ghost" onClick={() => setActive(null)}>
              Close
            </button>
            {onOpenDrawer ? (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setActive(null);
                  onOpenDrawer();
                }}
              >
                All words
              </button>
            ) : null}
          </span>
        </span>
      ) : null}
    </span>
  );
}

function splitWithTerms(
  text: string,
): Array<{ type: "text" | "term"; value: string }> {
  const terms = glossaryMatchTerms();
  if (!text || terms.length === 0) return [{ type: "text", value: text }];
  const escaped = terms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const chunks = text.split(re);
  return chunks.filter(Boolean).map((chunk) => {
    const hit = terms.some((t) => t.toLowerCase() === chunk.toLowerCase());
    return hit
      ? { type: "term" as const, value: chunk }
      : { type: "text" as const, value: chunk };
  });
}
