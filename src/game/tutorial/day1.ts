/**
 * Day-1 guided tutorial (shorter) — step-by-step conversation in the world.
 * Advances only when the matching player action fires.
 */

export type TutorialStepId =
  | "radio_chip"
  | "enter_home"
  | "water_cleaner"
  | "bed"
  | "done";

export type TutorialStep = {
  id: TutorialStepId;
  /** ≤25 words — shown as Nova's line. */
  line: string;
  /** Follow-up tip after the step (extra conversational beat). */
  after?: string;
  /** Where the bouncing arrow should point. */
  target: "radio" | "home_door" | "recycler" | "bed" | "none";
  room: "surface" | "home" | "greenhouse" | "lab" | "any";
};

/** Three jobs + bed — greenhouse/lab taught on later morning talks. */
export const DAY1_STEPS: TutorialStep[] = [
  {
    id: "radio_chip",
    line: "First job: drag a yellow chip onto the radio dish.",
    after: "Good! Radio lets Mission Control warn us later.",
    target: "radio",
    room: "surface",
  },
  {
    id: "enter_home",
    line: "Next: walk into the Crew home door.",
    after: "Home is where we run life support.",
    target: "home_door",
    room: "surface",
  },
  {
    id: "water_cleaner",
    line: "Drop chips on the water cleaner until it says ON.",
    after: "Nice. Cleaner saves water every day it runs.",
    target: "recycler",
    room: "home",
  },
  {
    id: "bed",
    line: "Last: drag me onto the bunk to end Day 1.",
    after: "Night falls — watch what changed, then a new day.",
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
