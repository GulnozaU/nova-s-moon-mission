import {
  createTutorialState,
  currentStep,
  tryAdvance,
  tutorialDone,
  type TutorialState,
  type TutorialStepId,
} from "./day1";
import {
  countSheltered,
  emptyCrewShelter,
  type CrewShelterMap,
} from "../ui/StormCrewHud";

export { countSheltered };

/** Shared across Phaser scene restarts within a mission. */
let tutorial: TutorialState = createTutorialState(0);
let crewShelter: CrewShelterMap = emptyCrewShelter();
let daySeen = -1;

export function resetTutorialForDay(day: number) {
  if (day !== daySeen) {
    daySeen = day;
    tutorial = createTutorialState(day);
    crewShelter = emptyCrewShelter();
  }
}

export function getTutorial(): TutorialState {
  return tutorial;
}

/** Advance day-1 coach; returns the follow-up tip line when a step completed. */
export function advanceTutorial(action: TutorialStepId): string | null {
  const step = currentStep(tutorial);
  const ok = tryAdvance(tutorial, action);
  if (!ok) return null;
  return step?.after ?? null;
}

export function isTutorialActive(): boolean {
  return tutorial.active && !tutorialDone(tutorial);
}

export function tutorialStep() {
  return currentStep(tutorial);
}

export function getCrewShelter(): CrewShelterMap {
  return crewShelter;
}

export function setCrewShelter(s: CrewShelterMap) {
  crewShelter = { ...s };
}

export function resetMissionGuide() {
  daySeen = -1;
  tutorial = createTutorialState(0);
  crewShelter = emptyCrewShelter();
}
