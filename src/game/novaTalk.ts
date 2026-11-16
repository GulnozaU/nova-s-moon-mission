import {
  PLAIN_LIT_DAYS,
  PLAIN_NIGHT_POWER,
  SCIENCE_POINTS_PLAIN,
  SCIENCE_SUCCESS_TARGET,
} from "../engine/constants";
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
 * Conversational morning briefing — step-by-step goal + pick.
 * Day 1 uses a short coach in MorningTalk; later days branch on state.
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

  // Plain site: last sunny day / first dark night — make the place rule loud.
  if (state.site === "plain" && day === PLAIN_LIT_DAYS && !stormToday) {
    return {
      goal: clipWords(`Day ${day}: last sunny day on the plain.`),
      story: clipWords(
        `Tomorrow solar chips drop to ~${PLAIN_NIGHT_POWER}. Bank battery tonight. Walks still give +${SCIENCE_POINTS_PLAIN} science.`,
      ),
      choices: [
        {
          id: "bank",
          label: "Save chips for night",
          hint: "Skip extra science walks — leave free chips for the battery.",
        },
        {
          id: "science_now",
          label: "Walk for science now",
          hint: `Plain walks still +${SCIENCE_POINTS_PLAIN}. Spend chips while the sun is up.`,
          patch: { scienceLevel: 1 },
        },
      ],
    };
  }
  if (state.site === "plain" && day === PLAIN_LIT_DAYS + 1 && !stormToday) {
    return {
      goal: clipWords(`Day ${day}: plain night — few solar chips.`),
      story: clipWords(
        `Dark mare night: ~${PLAIN_NIGHT_POWER} solar chips (+ battery). Ridge would still be sunny. Spend carefully.`,
      ),
      choices: [
        {
          id: "life",
          label: "Life support only",
          hint: "Chip cleaner and air. Skip costly walks tonight.",
          patch: { recycler: true, oxygenMaker: true },
        },
        {
          id: "still_walk",
          label: "Still walk for science",
          hint: `Walks still +${SCIENCE_POINTS_PLAIN} here — if you can spare a chip.`,
          patch: { scienceLevel: 1 },
        },
      ],
    };
  }

  // Day 2: teach greenhouse after the short Day-1 coach.
  if (day === 2 && !stormToday) {
    return {
      goal: clipWords("Day 2: water the plants with me."),
      story: clipWords(
        "Step one: cleaner on. Step two: water trays. Step three: chip the grow light.",
      ),
      choices: [
        {
          id: "plants",
          label: "Help plants",
          hint: "Go to Greenhouse. Tap water, drag onto trays, then chip the light.",
          patch: { greenhouse: true, recycler: true },
        },
        {
          id: "safer",
          label: "Life support only",
          hint: "Stay in Crew home. Chip cleaner and air maker first.",
          patch: { recycler: true, oxygenMaker: true },
        },
      ],
    };
  }

  if (day === 3 && !stormToday) {
    return {
      goal: clipWords("Day 3: check the lab storm screen."),
      story: clipWords(
        "Chip the radio, then visit Lab. Ana will read NASA's real flare note.",
      ),
      choices: [
        {
          id: "radio",
          label: "Chip radio first",
          hint: "Drop a chip on the dish, then walk to the Lab door.",
          patch: { comms: true },
        },
        {
          id: "lab",
          label: "Go to Lab",
          hint: "Enter Lab and tap the storm screen. Then chip the analyzer.",
          patch: { scienceLevel: 1 },
        },
      ],
    };
  }

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
