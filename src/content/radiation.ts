/**
 * "Why radiation matters" card shown after storm days (SPEC 4.3 / Prompt 3b).
 * Cites a real OSDR radiation or biology study — never invented.
 */

import type { OsdrStudy } from "../data/osdrTypes";
import type { Event } from "../types";

export function buildRadiationMattersCard(study: OsdrStudy): Event {
  return {
    id: "why-radiation-matters",
    title: "Why radiation matters",
    sourceBadge: study.source === "LIVE" ? "LIVE" : "ARCHIVED",
    explanation:
      "Storm energy can hurt living things. Scientists study this with real plants and animals in OSDR.",
    optionA: {
      id: "review-ok",
      label: "Got it",
      benefit: "Learn why shelter and shields matter",
      cost: "No resource change — this is a teaching card",
      effects: {},
    },
    optionB: {
      id: "review-again",
      label: "Read the study tip again",
      benefit: "Same lesson, one more look",
      cost: "No resource change",
      effects: {},
    },
    realWorldNote: `${study.id}: ${study.finding} Link: ${study.url}. Our crew exposure meter is still a game ASSUMPTION, not a Moon dose table.`,
  };
}
