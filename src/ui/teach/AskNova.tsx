import { useState } from "react";
import type { Event } from "../../types";
import { plainTalk } from "../../content/banned";
import { ART } from "../art";
import { SpaceText } from "./SpaceText";

type Props = {
  event: Event;
};

/** Explains the trade-off without naming the best choice (SPEC 6c). */
export function AskNova({ event }: Props) {
  const [open, setOpen] = useState(false);
  const hint = plainTalk(
    `One choice helps ${short(event.optionA.benefit)}, but ${short(event.optionA.cost)}. ` +
      `The other helps ${short(event.optionB.benefit)}, but ${short(event.optionB.cost)}. ` +
      `Think about water, air, and storms today.`,
  );

  return (
    <div className="ask-nova">
      <button type="button" className="btn ghost" onClick={() => setOpen(!open)}>
        <img src={ART.nova} alt="" />
        Ask Nova
      </button>
      {open ? (
        <div className="ask-nova__hint speech">
          <p>
            <SpaceText text={hint} />
          </p>
        </div>
      ) : null}
    </div>
  );
}

function short(s: string): string {
  const t = s.trim();
  return t.length > 42 ? `${t.slice(0, 40)}…` : t;
}
