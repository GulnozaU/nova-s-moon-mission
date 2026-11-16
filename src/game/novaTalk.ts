import { SCIENCE_SUCCESS_TARGET } from "../engine/constants";
import type { DayDecisions } from "../engine/types";
import type { Event, GameState } from "../types";
import type { StormAlert } from "../content/schedule";

export type NovaChoice = {
  id: string;
  label: string;
  /** Soft hint applied when picked (not a forced plan). */
  hint: string;
  patch?: Partial<DayDecisions>;
};

export type MorningTalk = {
  /** One goal line (≤25 words). */
  goal: string;
  /** Story beat — conversational. */
  story: string;
  choices: NovaChoice[];
};

/** Word-safe trim for on-screen Nova copy. */
export function clipWords(text: string, max = 25): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return words.join(" ");
  return words.slice(0, max).join(" ");
}

/**
 * Conversational morning briefing after Day 1.
 * Feels like talking with Nova: goal + pick + effect tease.
 */
export function morningTalk(
  state: GameState,
  event: Event | null,
  alerts: StormAlert[],
  commsYesterday: boolean,
): MorningTalk {
  const day = state.day;
  const stormToday = event?.stormSeverity !== undefined;
  const scienceLeft = Math.max(0, SCIENCE_SUCCESS_TARGET - state.science);

  if (stormToday) {
    return {
      goal: clipWords(`Day ${day}: a storm is here. Shelter the crew.`),
      story: clipWords(
        "I hear the wind. Drag Sam, Mira, and Ana into Crew home. Who stays out gets hurt more.",
      ),
      choices: [
        {
          id: "shelter_all",
          label: "Shelter everyone",
          hint: "Drag all three portraits onto Crew home.",
        },
        {
          id: "science_risk",
          label: "Risk a science walk",
          hint: "Science outside today adds storm risk.",
          patch: { scienceLevel: 1 },
        },
      ],
    };
  }

  if (alerts.length > 0 && commsYesterday) {
    const a = alerts[0]!;
    return {
      goal: clipWords(`Day ${day}: storm in ${a.daysUntil} day(s).`),
      story: clipWords(
        "Mission Control called because our radio was on. Keep chips on the dish, or build shield layers.",
      ),
      choices: [
        {
          id: "radio",
          label: "Keep radio on",
          hint: "Drop a chip on the radio again today.",
          patch: { comms: true },
        },
        {
          id: "shield",
          label: "Build shield",
          hint: "Drag a material crate onto the shield frame.",
          patch: { buildShield: true },
        },
      ],
    };
  }

  if (state.water < 14) {
    return {
      goal: clipWords(`Day ${day}: water is low. Cleaner helps.`),
      story: clipWords(
        "Tanks look thirsty. I'd put chips on the water cleaner — or we run dry soon.",
      ),
      choices: [
        {
          id: "cleaner",
          label: "Run water cleaner",
          hint: "Drop chips on the water cleaner in Crew home.",
          patch: { recycler: true },
        },
        {
          id: "plants_off",
          label: "Skip plants today",
          hint: "Save water; skip the greenhouse.",
          patch: { greenhouse: false },
        },
      ],
    };
  }

  if (state.oxygen < 12) {
    return {
      goal: clipWords(`Day ${day}: air is thin. Run the maker.`),
      story: clipWords(
        "Deep breath. The air maker needs chips — want me to remind you in Crew home?",
      ),
      choices: [
        {
          id: "air",
          label: "Power air maker",
          hint: "Drop chips on the air maker.",
          patch: { oxygenMaker: true },
        },
        {
          id: "plants",
          label: "Grow plants too",
          hint: "Water trays, then chip the grow light.",
          patch: { greenhouse: true },
        },
      ],
    };
  }

  if (scienceLeft > 0) {
    return {
      goal: clipWords(
        `Day ${day}: science ${state.science}/${SCIENCE_SUCCESS_TARGET}. Keep going.`,
      ),
      story: clipWords(
        "We still need samples. Lab analyzer or a surface science walk — which adventure today?",
      ),
      choices: [
        {
          id: "lab",
          label: "Lab analyzer",
          hint: "Drop a chip on the analyzer in the Lab.",
          patch: { scienceLevel: 1 },
        },
        {
          id: "walk",
          label: "Science walk outside",
          hint: "Drop a chip on the science spot on the surface.",
          patch: { scienceLevel: 1 },
        },
      ],
    };
  }

  return {
    goal: clipWords(`Day ${day}: stay safe. Science goal met!`),
    story: clipWords(
      "Nice work on science. Today we keep tanks full and watch for storms. What first?",
    ),
    choices: [
      {
        id: "radio",
        label: "Listen for storms",
        hint: "Chip the radio dish.",
        patch: { comms: true },
      },
      {
        id: "life",
        label: "Life support",
        hint: "Water cleaner and air maker in Crew home.",
        patch: { recycler: true, oxygenMaker: true },
      },
    ],
  };
}

export function consequenceNovaLine(deltas: { key: string; after: number; before: number }[]): string {
  const bad = deltas.find((d) => d.key === "exposure" && d.after > d.before);
  const water = deltas.find((d) => d.key === "water");
  if (bad) return clipWords("Oof — that storm stung. Tomorrow we shelter earlier.");
  if (water && water.after < water.before) {
    return clipWords("Water went down. Cleaner tomorrow, okay?");
  }
  return clipWords("Day done. I'm proud of how we chose.");
}
