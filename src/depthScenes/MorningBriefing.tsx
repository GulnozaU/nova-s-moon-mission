import { useEffect, useState } from "react";
import type { DayDecisions } from "../engine/types";
import type { Event, GameState } from "../types";
import type { StormAlert } from "../content/schedule";
import { storyBeatForDay } from "../game/storyLayer";
import { clipWords } from "../game/novaTalk";
import { audio } from "../audio/audio";
import "./interactives/depthInteract.css";

type Props = {
  state: GameState;
  event: Event | null;
  alerts: StormAlert[];
  commsYesterday: boolean;
  dayKey: number;
  onPatch: (patch: Partial<DayDecisions>) => void;
  onNovaLine: (line: string) => void;
};

/** Prompt E morning briefing — opens once per day (incl. day 1). */
export function MorningBriefing({
  state,
  event,
  alerts,
  commsYesterday,
  dayKey,
  onPatch,
  onNovaLine,
}: Props) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, [dayKey]);

  if (!open) return null;

  const beat = storyBeatForDay(state, event, alerts, commsYesterday);

  return (
    <div className="depth-briefing" role="dialog" aria-label="Morning briefing">
      <p className="depth-briefing__goal">{beat.goal}</p>
      <p className="depth-briefing__story">{beat.story}</p>
      <p className="depth-briefing__ask">{clipWords("Which one do you pick?")}</p>
      <div className="depth-briefing__choices">
        {beat.choices.slice(0, 2).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              audio.play("uiClick");
              if (c.patch) onPatch(c.patch);
              onNovaLine(clipWords(c.hint));
              setOpen(false);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
