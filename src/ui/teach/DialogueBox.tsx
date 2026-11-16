import { useEffect, useState } from "react";
import { audio } from "../../audio/audio";
import { ART } from "../art";
import { ReadAloudButton } from "./ReadAloudButton";
import { SpaceText } from "./SpaceText";

export type DialogueLine = {
  speaker?: "Nova" | "Mission Control";
  /** Max ~12 words per SPEC 6e. */
  text: string;
};

type Props = {
  lines: DialogueLine[];
  onDone?: () => void;
  faceSrc?: string;
};

/**
 * Henry's Farm style: name tag, one idea per line, click to continue.
 * Typewriter ticks while the line reveals (visual cue for the sound).
 */
export function DialogueBox({
  lines,
  onDone,
  faceSrc = ART.nova,
}: Props) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState("");
  const line = lines[i];

  useEffect(() => {
    if (!line) return;
    setShown("");
    let n = 0;
    const full = line.text;
    const id = window.setInterval(() => {
      n += 1;
      setShown(full.slice(0, n));
      if (n % 2 === 0) audio.play("typewriter");
      if (n >= full.length) window.clearInterval(id);
    }, 28);
    return () => window.clearInterval(id);
  }, [line, i]);

  if (!line) return null;

  const advance = () => {
    audio.play("uiClick");
    if (i >= lines.length - 1) {
      onDone?.();
      return;
    }
    setI((prev) => prev + 1);
  };

  return (
    <div className="dialogue">
      <img src={faceSrc} alt="" className="dialogue__face bounce" />
      <div className="dialogue__box">
        <span className="dialogue__name">{line.speaker ?? "Nova"}</span>
        <p>
          <SpaceText text={shown || "…"} />
          {shown.length < line.text.length ? (
            <span className="dialogue__cursor" aria-hidden>
              ▍
            </span>
          ) : null}
        </p>
        <div className="dialogue__actions">
          <ReadAloudButton text={line.text} />
          <button
            type="button"
            className="btn primary"
            onClick={advance}
            onMouseEnter={() => audio.play("uiHover")}
          >
            {i >= lines.length - 1 ? "Got it" : "Click to continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
