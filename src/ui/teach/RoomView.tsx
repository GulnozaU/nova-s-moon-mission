import { ART } from "../art";
import { DialogueBox } from "./DialogueBox";
import { ReadAloudButton } from "./ReadAloudButton";
import { SpaceText } from "./SpaceText";

export type RoomId = "home" | "greenhouse" | "lab";

type Props = {
  room: RoomId;
  isDay: boolean;
  onClose: () => void;
  onOpenGlossary: () => void;
};

const ROOMS: Record<
  RoomId,
  { title: string; art: string; lines: string[]; nova: string[] }
> = {
  home: {
    title: "Crew home",
    art: ART.bunks,
    lines: [
      "This is where the crew sleeps and rests.",
      "Shelter means coming back here when storms arrive.",
    ],
    nova: [
      "Hi! This is our crew home.",
      "We rest here when storms get wild.",
    ],
  },
  greenhouse: {
    title: "Gardenhouse",
    art: ART.greenhouseIn,
    lines: [
      "Plants here can make a little oxygen.",
      "They also drink water from our tanks.",
    ],
    nova: [
      "Welcome to the gardenhouse!",
      "Plants help, but they are thirsty.",
    ],
  },
  lab: {
    title: "Science lab",
    art: ART.lab,
    lines: [
      "We plan science walks and check storm notes here.",
      "More science means more time outside.",
    ],
    nova: [
      "This is our science lab.",
      "Outside work earns science points.",
    ],
  },
};

export function RoomView({ room, isDay, onClose, onOpenGlossary }: Props) {
  const info = ROOMS[room];
  const spoken = info.lines.join(" ");

  return (
    <section className={`room-view ${isDay ? "is-day" : "is-night"}`}>
      <div className="room-view__sky" aria-hidden="true" />
      <header className="room-view__bar">
        <h2>{info.title}</h2>
        <span className="day-pill">{isDay ? "Daylight" : "Night"}</span>
        <ReadAloudButton text={spoken} />
        <button type="button" className="btn ghost" onClick={onClose}>
          Back to base
        </button>
      </header>
      <div className="room-view__stage">
        <img src={info.art} alt={info.title} className="room-view__art" />
        <DialogueBox
          lines={info.nova.map((text) => ({ text, speaker: "Nova" as const }))}
          faceSrc={ART.nova}
        />
      </div>
      <ul className="room-view__facts">
        {info.lines.map((line) => (
          <li key={line}>
            <SpaceText text={line} onOpenDrawer={onOpenGlossary} />
          </li>
        ))}
      </ul>
    </section>
  );
}
