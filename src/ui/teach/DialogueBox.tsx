import { useState } from "react";
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
 */
export function DialogueBox({
  lines,
  onDone,
  faceSrc = ART.nova,
}: Props) {
  const [i, setI] = useState(0);
  const line = lines[i];
  if (!line) return null;

  const advance = () => {
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
          <SpaceText text={line.text} />
        </p>
        <div className="dialogue__actions">
          <ReadAloudButton text={line.text} />
          <button type="button" className="btn primary" onClick={advance}>
            {i >= lines.length - 1 ? "Got it" : "Click to continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
