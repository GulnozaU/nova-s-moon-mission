/**
 * Day-1 guided tutorial (Henry's Farm style).
 * Advances only when the matching player action fires.
 */

export type TutorialStepId =
  | "radio_chip"
  | "enter_home"
  | "water_cleaner"
  | "greenhouse_water"
  | "lab_analyzer"
  | "back_home"
  | "bed"
  | "done";

export type TutorialStep = {
  id: TutorialStepId;
  /** ≤25 words — shown as Nova's line. */
  line: string;
  /** Where the bouncing arrow should point (scene-relative hint). */
  target: "radio" | "home_door" | "recycler" | "tap_water" | "analyzer" | "bed" | "none";
  room: "surface" | "home" | "greenhouse" | "lab" | "any";
};

export const DAY1_STEPS: TutorialStep[] = [
  {
    id: "radio_chip",
    line: "Drag a yellow power chip onto the radio dish.",
    target: "radio",
    room: "surface",
  },
  {
    id: "enter_home",
    line: "Great! Walk into the Crew home door.",
    target: "home_door",
    room: "surface",
  },
  {
    id: "water_cleaner",
    line: "Drop chips on the water cleaner until it says ON.",
    target: "recycler",
    room: "home",
  },
  {
    id: "greenhouse_water",
    line: "Exit, enter Greenhouse, and drag water onto the plant trays.",
    target: "tap_water",
    room: "greenhouse",
  },
  {
    id: "lab_analyzer",
    line: "Now the Lab — drop a chip on the sample analyzer.",
    target: "analyzer",
    room: "lab",
  },
  {
    id: "back_home",
    line: "Head back to Crew home when you are ready to sleep.",
    target: "home_door",
    room: "any",
  },
  {
    id: "bed",
    line: "Drag Nova onto the bed to end Day 1.",
    target: "bed",
    room: "home",
  },
];

export type TutorialState = {
  active: boolean;
  index: number;
};

export function createTutorialState(day: number): TutorialState {
  return { active: day === 1, index: 0 };
}

export function currentStep(state: TutorialState): TutorialStep | null {
  if (!state.active) return null;
  return DAY1_STEPS[state.index] ?? null;
}

/** Returns true if the step advanced. */
export function tryAdvance(
  state: TutorialState,
  action: TutorialStepId,
): boolean {
  if (!state.active) return false;
  const step = DAY1_STEPS[state.index];
  if (!step || step.id !== action) return false;
  state.index += 1;
  if (state.index >= DAY1_STEPS.length) {
    state.active = false;
  }
  return true;
}

export function tutorialDone(state: TutorialState): boolean {
  return !state.active || state.index >= DAY1_STEPS.length;
}

/** Pure smoke helper: walk every step with the matching action. */
export function runTutorialScript(): TutorialStepId[] {
  const state = createTutorialState(1);
  const done: TutorialStepId[] = [];
  for (const step of DAY1_STEPS) {
    const ok = tryAdvance(state, step.id);
    if (!ok) throw new Error(`Tutorial stuck at ${step.id}`);
    done.push(step.id);
  }
  if (state.active) throw new Error("Tutorial still active");
  return done;
}
