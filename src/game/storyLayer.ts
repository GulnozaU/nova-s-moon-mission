/**
 * Prompt E — story layer guidance for all 10 mission days.
 * Conversational Nova beats; ≤25 words per on-screen line (via clipWords).
 */
import { SCIENCE_SUCCESS_TARGET } from "../engine/constants";
import type { Event, GameState } from "../types";
import type { StormAlert } from "../content/schedule";
import { clipWords, morningTalk, type MorningTalk, type NovaChoice } from "./novaTalk";
import { DAY1_STEPS } from "./tutorial/day1";

export type StoryBeat = MorningTalk & {
  day: number;
  /** Day-1 tutorial uses step lines instead of morning choices. */
  tutorial?: boolean;
};

const DAY_STORIES: Record<
  number,
  (ctx: {
    state: GameState;
    event: Event | null;
    alerts: StormAlert[];
    commsYesterday: boolean;
  }) => MorningTalk
> = {
  1: () => ({
    goal: clipWords("Day 1: learn the base. Chip the radio, then home."),
    story: clipWords(
      "I'm Nova. Drag yellow chips onto machines. Walk rooms. Bed ends the day.",
    ),
    choices: [
      {
        id: "start",
        label: "Let's go",
        hint: DAY1_STEPS[0]!.line,
      },
    ],
  }),
  2: ({ state }) => ({
    goal: clipWords(`Day 2: water ${state.water}. Keep the cleaner on.`),
    story: clipWords(
      "Morning! Tanks need care. Chip the water cleaner, then peek at the plants.",
    ),
    choices: [
      {
        id: "cleaner",
        label: "Water cleaner",
        hint: "Drop chips on the water cleaner until it is ON.",
        patch: { recycler: true },
      },
      {
        id: "radio",
        label: "Radio first",
        hint: "Chip the dish so we hear storms later.",
        patch: { comms: true },
      },
    ],
  }),
  3: ({ state }) => ({
    goal: clipWords(`Day 3: air ${state.oxygen}. Power the air maker.`),
    story: clipWords(
      "Deep breath. Air maker wants chips. Plants help a little too.",
    ),
    choices: [
      {
        id: "air",
        label: "Air maker",
        hint: "Fill the air maker with chips in Crew home.",
        patch: { oxygenMaker: true },
      },
      {
        id: "plants",
        label: "Water plants",
        hint: "Tap, then drag water onto trays. Chip the grow light.",
        patch: { greenhouse: true },
      },
    ],
  }),
  4: ({ state, alerts, commsYesterday, event }) => {
    if (event?.stormSeverity !== undefined) {
      return morningTalk(state, event, alerts, commsYesterday);
    }
    return {
      goal: clipWords("Day 4: watch the sky. Radio matters."),
      story: clipWords(
        commsYesterday
          ? "Mission Control may call. Build a shield layer if you can."
          : "No warning without yesterday's radio. Chip the dish today.",
      ),
      choices: [
        {
          id: "radio",
          label: "Radio on",
          hint: "Drop a chip on the radio dish.",
          patch: { comms: true },
        },
        {
          id: "shield",
          label: "Shield layer",
          hint: "Drag crates onto the shield frame.",
          patch: { buildShield: true },
        },
      ],
    };
  },
  5: (ctx) =>
    ctx.event?.stormSeverity !== undefined
      ? {
          goal: clipWords("Day 5: storm day! Shelter Sam, Mira, and Ana."),
          story: clipWords(
            "Drag each crew portrait into Crew home. Shields cut the sting.",
          ),
          choices: [
            {
              id: "shelter",
              label: "Shelter all",
              hint: "Drag all three portraits onto Crew home.",
            },
            {
              id: "risk",
              label: "Stay for science",
              hint: "Risky — outdoor work raises exposure.",
              patch: { scienceLevel: 1 },
            },
          ],
        }
      : morningTalk(ctx.state, ctx.event, ctx.alerts, ctx.commsYesterday),
  6: ({ state }) => ({
    goal: clipWords(
      `Day 6: science ${state.science}/${SCIENCE_SUCCESS_TARGET}. Gather samples.`,
    ),
    story: clipWords(
      "Storm passed. Rover out, then Lab analyzer. We still need science points.",
    ),
    choices: [
      {
        id: "rover",
        label: "Send rover",
        hint: "Chip the rover on the surface.",
        patch: { scienceLevel: 1 },
      },
      {
        id: "life",
        label: "Refill tanks",
        hint: "Water cleaner and air maker first.",
        patch: { recycler: true, oxygenMaker: true },
      },
    ],
  }),
  7: ({ state, commsYesterday }) => ({
    goal: clipWords(`Day 7: battery ${state.battery}/12. Plan power.`),
    story: clipWords(
      commsYesterday
        ? "Radio worked yesterday — listen for the next storm window."
        : "Unused chips sleep in the battery (max 12). Chip the radio again.",
    ),
    choices: [
      {
        id: "radio",
        label: "Keep radio",
        hint: "Chip the dish for tomorrow's warning.",
        patch: { comms: true },
      },
      {
        id: "shield",
        label: "Thicker shield",
        hint: "More crates on the shield frame.",
        patch: { buildShield: true },
      },
    ],
  }),
  8: (ctx) =>
    ctx.event?.stormSeverity !== undefined || ctx.alerts.length > 0
      ? morningTalk(ctx.state, ctx.event, ctx.alerts, ctx.commsYesterday)
      : {
          goal: clipWords("Day 8: second storm window soon."),
          story: clipWords(
            "Fill life support, then science. Shelter plans ready?",
          ),
          choices: [
            {
              id: "prep",
              label: "Life support",
              hint: "Cleaner + air maker ON.",
              patch: { recycler: true, oxygenMaker: true },
            },
            {
              id: "science",
              label: "Lab science",
              hint: "Chip the analyzer with samples.",
              patch: { scienceLevel: 1 },
            },
          ],
        },
  9: (ctx) =>
    ctx.event?.stormSeverity !== undefined
      ? {
          goal: clipWords("Day 9: big storm. Shelter everyone."),
          story: clipWords(
            "Same drill — portraits into home. Shields help a lot today.",
          ),
          choices: [
            {
              id: "shelter",
              label: "Shelter all",
              hint: "Drag Sam, Mira, and Ana into Crew home.",
            },
          ],
        }
      : morningTalk(ctx.state, ctx.event, ctx.alerts, ctx.commsYesterday),
  10: ({ state }) => ({
    goal: clipWords(
      `Day 10: last day. Science ${state.science}/${SCIENCE_SUCCESS_TARGET}.`,
    ),
    story: clipWords(
      state.science >= SCIENCE_SUCCESS_TARGET
        ? "Goal met! Keep tanks safe and sleep proud."
        : "Last chance for samples. Analyzer or rover — then bed.",
    ),
    choices: [
      {
        id: "push",
        label: "Push science",
        hint: "Chip rover or lab analyzer.",
        patch: { scienceLevel: 1 },
      },
      {
        id: "safe",
        label: "Play it safe",
        hint: "Life support on, then bed.",
        patch: { recycler: true, oxygenMaker: true, comms: true },
      },
    ],
  }),
};

/**
 * Full Prompt E beat for the current day (tutorial flag on day 1).
 * Falls back to reactive morningTalk when day script is missing.
 */
export function storyBeatForDay(
  state: GameState,
  event: Event | null,
  alerts: StormAlert[],
  commsYesterday: boolean,
): StoryBeat {
  const day = Math.max(1, Math.min(10, state.day));
  const script = DAY_STORIES[day];
  const talk = script
    ? script({ state, event, alerts, commsYesterday })
    : morningTalk(state, event, alerts, commsYesterday);

  // Storm / alert / resource urgency can override soft day scripts.
  if (day !== 1 && (event?.stormSeverity !== undefined || (alerts.length > 0 && commsYesterday))) {
    const urgent = morningTalk(state, event, alerts, commsYesterday);
    return { day, ...urgent, tutorial: false };
  }
  if (day !== 1 && (state.water < 12 || state.oxygen < 10)) {
    const urgent = morningTalk(state, event, alerts, commsYesterday);
    return { day, ...urgent, tutorial: false };
  }

  return { day, ...talk, tutorial: day === 1 };
}

export type { NovaChoice, MorningTalk };
