/**
 * Day-1 guided tutorial — Nova talks from the corner; player taps places + drags chips.
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
    line: "Drag a yellow chip from the top tray onto the Radio dish.",
    after: "Radio ON — Mission Control can warn us before storms (−1 chip).",
    target: "radio",
    room: "surface",
  },
  {
    id: "enter_home",
    line: "Tap Home (right menu) or the Home glow to go inside.",
    after: "Home is life support — cleaner and air maker live here.",
    target: "home_door",
    room: "surface",
  },
  {
    id: "water_cleaner",
    line: "Drag chips onto the Water cleaner until it says ON.",
    after: "Cleaner ON — saves water every day it runs (−2 chips).",
    target: "recycler",
    room: "home",
  },
  {
    id: "bed",
    line: "Drag me (bottom-left) onto the bunk to end Day 1.",
    after: "Night falls — watch water, O₂, and science change.",
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
