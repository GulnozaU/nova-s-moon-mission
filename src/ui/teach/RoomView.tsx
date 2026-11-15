import { useState } from "react";
import type { DayDecisions } from "../../engine/types";
import {
  COMMS_COST,
  GREENHOUSE_COST,
  OXYGEN_MAKER_COST,
  RECYCLER_COST,
  SCIENCE_COST_PER_LEVEL,
  SCIENCE_LEVEL_MAX,
} from "../../engine/constants";
import { ART } from "../art";
import { SourceBadge } from "../SourceBadge";
import { DialogueBox } from "./DialogueBox";
import { ReadAloudButton } from "./ReadAloudButton";
import { SpaceText } from "./SpaceText";

export type RoomId = "home" | "greenhouse" | "lab";

type HeldItem = "watering-can" | "notebook" | "wrench" | null;

type Hotspot = {
  id: string;
  label: string;
  verb: string;
  x: number;
  y: number;
  needs?: HeldItem;
  done?: boolean;
  onActivate: () => void;
};

type Props = {
  room: RoomId;
  isDay: boolean;
  decisions: DayDecisions;
  onDecisions: (d: DayDecisions | ((p: DayDecisions) => DayDecisions)) => void;
  onClose: () => void;
  onOpenGlossary: () => void;
  canAct: boolean;
};

const ROOM_META: Record<
  RoomId,
  { title: string; art: string; goal: string }
> = {
  home: {
    title: "Crew home",
    art: ART.bunks,
    goal: "Grab the wrench, then tap a machine to turn it on or off.",
  },
  greenhouse: {
    title: "Greenhouse",
    art: ART.greenhouseIn,
    goal: "Grab the watering can, then tap the plants to add water.",
  },
  lab: {
    title: "Science lab",
    art: ART.lab,
    goal: "Grab Nova's notebook, then tap the work bench to plan a science walk.",
  },
};

export function RoomView({
  room,
  isDay,
  decisions,
  onDecisions,
  onClose,
  onOpenGlossary,
  canAct,
}: Props) {
  const meta = ROOM_META[room];
  const [held, setHeld] = useState<HeldItem>(null);
  const [splash, setSplash] = useState(false);
  const [novaSay, setNovaSay] = useState<string[]>(() => introLines(room));
  const [fx, setFx] = useState<string | null>(null);

  const say = (lines: string[]) => setNovaSay(lines);
  const pulseFx = (id: string) => {
    setFx(id);
    window.setTimeout(() => setFx(null), 700);
  };

  const hotspots = buildHotspots({
    room,
    held,
    decisions,
    canAct,
    setHeld,
    setSplash,
    say,
    pulseFx,
    onDecisions,
  });

  const spoken = [...novaSay, meta.goal].join(" ");
  const holdingLabel =
    held === "watering-can"
      ? "💧 Watering can"
      : held === "notebook"
        ? "📓 Notebook"
        : held === "wrench"
          ? "🔧 Wrench"
          : "Nothing — grab something!";

  return (
    <section className={`room-view ${isDay ? "is-day" : "is-night"}`}>
      <div className="room-view__sky" aria-hidden="true" />
      <header className="room-view__bar">
        <h2>{meta.title}</h2>
        <span className="day-pill">{isDay ? "Daylight" : "Night"}</span>
        <span className="day-pill room-held" aria-live="polite">
          Holding: {holdingLabel}
        </span>
        <ReadAloudButton text={spoken} />
        <button type="button" className="btn ghost" onClick={onClose}>
          Back to base
        </button>
      </header>

      <p className="room-view__goal">
        <SpaceText text={meta.goal} onOpenDrawer={onOpenGlossary} />{" "}
        <SourceBadge badge="ASSUMPTION" />
      </p>

      <div className="room-view__stage">
        <div className="room-play">
          <img src={meta.art} alt={meta.title} className="room-view__art" />
          <img
            src={ART.nova}
            alt="Nova"
            className={`room-nova ${splash ? "room-nova--splash" : "bob"}`}
          />
          {splash ? <div className="room-splash" aria-hidden="true" /> : null}
          {hotspots.map((h) => (
            <button
              key={h.id}
              type="button"
              className={`room-hotspot ${h.done ? "is-done" : ""} ${
                fx === h.id ? "is-pulse" : ""
              } ${held && h.needs === held ? "is-target" : ""}`}
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
              onClick={h.onActivate}
              aria-label={`${h.verb}: ${h.label}`}
            >
              <span className="room-hotspot__verb">{h.verb}</span>
              <span className="room-hotspot__label">{h.label}</span>
            </button>
          ))}
        </div>

        <DialogueBox
          key={novaSay.join("|")}
          lines={novaSay.map((text) => ({ text, speaker: "Nova" as const }))}
          faceSrc={ART.nova}
        />
      </div>

      <ul className="room-view__facts">
        {statusLines(room, decisions).map((line) => (
          <li key={line}>
            <SpaceText text={line} onOpenDrawer={onOpenGlossary} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function buildHotspots(args: {
  room: RoomId;
  held: HeldItem;
  decisions: DayDecisions;
  canAct: boolean;
  setHeld: (h: HeldItem) => void;
  setSplash: (v: boolean) => void;
  say: (lines: string[]) => void;
  pulseFx: (id: string) => void;
  onDecisions: (d: DayDecisions | ((p: DayDecisions) => DayDecisions)) => void;
}): Hotspot[] {
  const {
    room,
    held,
    decisions,
    canAct,
    setHeld,
    setSplash,
    say,
    pulseFx,
    onDecisions,
  } = args;

  if (room === "greenhouse") {
    return [
      {
        id: "can",
        label: "Watering can",
        verb: held === "watering-can" ? "Holding" : "Grab",
        x: 18,
        y: 68,
        done: held === "watering-can",
        onActivate: () => {
          if (!canAct) {
            say(["Come back when you plan today's jobs."]);
            return;
          }
          setHeld("watering-can");
          say([
            "You grabbed the watering can!",
            "Now tap the plant trays to add water.",
          ]);
        },
      },
      {
        id: "plants",
        label: "Plant trays",
        verb: decisions.greenhouse ? "Watered!" : "Add water",
        x: 55,
        y: 52,
        needs: "watering-can",
        done: Boolean(decisions.greenhouse),
        onActivate: () => {
          if (!canAct) {
            say(["Plants wait for your power plan."]);
            return;
          }
          if (held !== "watering-can" && !decisions.greenhouse) {
            say(["First grab the watering can on the left."]);
            pulseFx("can");
            return;
          }
          const next = !decisions.greenhouse;
          onDecisions({ ...decisions, greenhouse: next });
          if (next) {
            setSplash(true);
            window.setTimeout(() => setSplash(false), 900);
            setHeld(null);
            say([
              "Splash! Plants got a drink.",
              `That uses ${GREENHOUSE_COST} power and 2 water, and gives a little oxygen.`,
            ]);
          } else {
            say(["You turned the greenhouse off. Plants wait."]);
          }
        },
      },
      {
        id: "leaves",
        label: "Check leaves",
        verb: "Look",
        x: 78,
        y: 40,
        onActivate: () => {
          say([
            "Green leaves make a little oxygen for us to breathe.",
            "That is why the greenhouse helps — but plants are thirsty!",
          ]);
          pulseFx("leaves");
        },
      },
    ];
  }

  if (room === "lab") {
    return [
      {
        id: "notebook",
        label: "Science notebook",
        verb: held === "notebook" ? "Holding" : "Grab",
        x: 22,
        y: 58,
        done: held === "notebook",
        onActivate: () => {
          if (!canAct) {
            say(["Come plan jobs, then we can write a science walk."]);
            return;
          }
          setHeld("notebook");
          say([
            "Notebook ready!",
            "Tap the work bench to add one science walk outside.",
          ]);
        },
      },
      {
        id: "bench",
        label: "Work bench",
        verb:
          decisions.scienceLevel > 0
            ? `Walks: ${decisions.scienceLevel}`
            : "Plan walk",
        x: 58,
        y: 48,
        needs: "notebook",
        done: decisions.scienceLevel > 0,
        onActivate: () => {
          if (!canAct) {
            say(["Science walks need a power plan first."]);
            return;
          }
          if (held !== "notebook" && decisions.scienceLevel === 0) {
            say(["Grab the notebook first."]);
            pulseFx("notebook");
            return;
          }
          const next = Math.min(SCIENCE_LEVEL_MAX, decisions.scienceLevel + 1);
          onDecisions({ ...decisions, scienceLevel: next });
          setHeld(null);
          say([
            `Science walk level ${next}!`,
            `Each walk uses ${SCIENCE_COST_PER_LEVEL} power and a little risk outside.`,
            "Tap the bench again for more walks, or tap Undo on the right.",
          ]);
          pulseFx("bench");
        },
      },
      {
        id: "undo",
        label: "Cancel a walk",
        verb: "Undo",
        x: 82,
        y: 62,
        done: decisions.scienceLevel === 0,
        onActivate: () => {
          if (!canAct) return;
          const next = Math.max(0, decisions.scienceLevel - 1);
          onDecisions({ ...decisions, scienceLevel: next });
          say(
            next === 0
              ? ["No science walks today. Safer, but less discovery."]
              : [`Okay — now ${next} walk${next === 1 ? "" : "s"}.`],
          );
        },
      },
      {
        id: "chart",
        label: "Storm chart",
        verb: "Look",
        x: 40,
        y: 28,
        onActivate: () => {
          say([
            "This chart shows storms from the Sun.",
            "When a storm is big, stay near shelter!",
          ]);
        },
      },
    ];
  }

  return [
    {
      id: "wrench",
      label: "Tool wrench",
      verb: held === "wrench" ? "Holding" : "Grab",
      x: 14,
      y: 70,
      done: held === "wrench",
      onActivate: () => {
        if (!canAct) {
          say(["Grab tools when you plan today's jobs."]);
          return;
        }
        setHeld("wrench");
        say(["Wrench ready! Tap a machine to turn it on or off."]);
      },
    },
    {
      id: "recycler",
      label: "Water cleaner",
      verb: decisions.recycler ? "ON" : "Turn on",
      x: 38,
      y: 55,
      needs: "wrench",
      done: decisions.recycler,
      onActivate: () => {
        if (!canAct) return;
        if (held !== "wrench" && !decisions.recycler) {
          say(["Grab the wrench first, then fix the water cleaner."]);
          pulseFx("wrench");
          return;
        }
        const next = !decisions.recycler;
        onDecisions({ ...decisions, recycler: next });
        setHeld(null);
        say(
          next
            ? [
                "Water cleaner ON!",
                `Uses ${RECYCLER_COST} power. Crew drinks 1 water instead of 4.`,
              ]
            : ["Water cleaner off. We will use more water today."],
        );
        pulseFx("recycler");
      },
    },
    {
      id: "air",
      label: "Air maker",
      verb: decisions.oxygenMaker ? "ON" : "Turn on",
      x: 62,
      y: 48,
      needs: "wrench",
      done: decisions.oxygenMaker,
      onActivate: () => {
        if (!canAct) return;
        if (held !== "wrench" && !decisions.oxygenMaker) {
          say(["Grab the wrench, then tap the air maker."]);
          pulseFx("wrench");
          return;
        }
        const next = !decisions.oxygenMaker;
        onDecisions({ ...decisions, oxygenMaker: next });
        setHeld(null);
        say(
          next
            ? [
                "Air maker ON! More oxygen for the crew.",
                `Costs ${OXYGEN_MAKER_COST} power and 1 water.`,
              ]
            : ["Air maker off."],
        );
        pulseFx("air");
      },
    },
    {
      id: "radio",
      label: "Talk to Earth",
      verb: decisions.comms ? "ON" : "Turn on",
      x: 82,
      y: 36,
      needs: "wrench",
      done: decisions.comms,
      onActivate: () => {
        if (!canAct) return;
        if (held !== "wrench" && !decisions.comms) {
          say(["Grab the wrench, then tap the radio."]);
          pulseFx("wrench");
          return;
        }
        const next = !decisions.comms;
        onDecisions({ ...decisions, comms: next });
        setHeld(null);
        say(
          next
            ? [
                "Radio ON! Earth can warn us sooner about storms.",
                `Uses ${COMMS_COST} power.`,
              ]
            : ["Radio off. Storm warnings may come late."],
        );
        pulseFx("radio");
      },
    },
    {
      id: "bunk",
      label: "Crew bunks",
      verb: "Rest tip",
      x: 50,
      y: 78,
      onActivate: () => {
        say([
          "This is where we sleep.",
          "When a big storm comes, we shelter here to stay safe.",
        ]);
      },
    },
  ];
}

function introLines(room: RoomId): string[] {
  if (room === "greenhouse") {
    return [
      "Welcome to the greenhouse!",
      "Grab the watering can, then tap the plants to add water.",
    ];
  }
  if (room === "lab") {
    return [
      "This is our science lab.",
      "Grab my notebook, then tap the work bench to plan an outside walk.",
    ];
  }
  return [
    "This is crew home.",
    "Grab the wrench, then tap a machine to turn it on.",
  ];
}

function statusLines(room: RoomId, d: DayDecisions): string[] {
  if (room === "greenhouse") {
    return [
      d.greenhouse
        ? "Today: greenhouse ON — plants drink 2 water."
        : "Today: greenhouse off — plants wait.",
      "Plants can make a little oxygen when watered.",
    ];
  }
  if (room === "lab") {
    return [
      d.scienceLevel > 0
        ? `Today: ${d.scienceLevel} science walk${d.scienceLevel === 1 ? "" : "s"} planned.`
        : "Today: no science walks yet.",
      "More walks = more science, more power, a little more risk.",
    ];
  }
  return [
    `Water cleaner: ${d.recycler ? "ON" : "off"}`,
    `Air maker: ${d.oxygenMaker ? "ON" : "off"}`,
    `Talk to Earth: ${d.comms ? "ON" : "off"}`,
  ];
}
