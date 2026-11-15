/**
 * Greenhouse event built from a real OSDR study (SPEC 4.3 / Prompt 3b).
 */

import type { OsdrStudy } from "../data/osdrTypes";
import type { Event } from "../types";
import { eventImageFor } from "./images";

export const ISS_MOON_CAUTION =
  "Caution: results from the ISS or Earth labs may not match the Moon.";

/**
 * Kid-facing greenhouse card from the chosen OSDR study.
 * Benefit/cost match SPEC Section 5; finding + link come from the study record.
 */
export function buildGreenhouseEvent(study: OsdrStudy): Event {
  return {
    id: "greenhouse-experiment",
    title: "Greenhouse experiment",
    sourceBadge: study.source === "LIVE" ? "LIVE" : "ARCHIVED",
    explanation: `Study ${study.id} used ${study.organism}. ${shortTitle(study.title)} Water the trays, or save water?`,
    optionA: {
      id: "water-plants",
      label: "Water the plants",
      benefit: "+1 oxygen and +1 science from the plants",
      cost: "2 water leave your tanks (plants also need power)",
      effects: {
        water: -2,
        oxygen: 1,
        science: 1,
      },
    },
    optionB: {
      id: "save-water",
      label: "Save the water",
      benefit: "Tanks stay fuller today",
      cost: "No plant bonus now; in 2 days plants wilt (−1 oxygen)",
      effects: {
        delayed: {
          afterDays: 2,
          oxygen: -1,
          note: "Skipped watering — plants made less air later.",
        },
      },
    },
    image: eventImageFor("greenhouse"),
    realWorldNote: `${study.finding} See ${study.url}. ${ISS_MOON_CAUTION}`,
  };
}

function shortTitle(title: string): string {
  const t = title.trim();
  if (t.length <= 90) return t.endsWith(".") ? t : `${t}.`;
  return `${t.slice(0, 87)}…`;
}

export type GreenhouseCard = {
  event: Event;
  study: OsdrStudy;
  studyUrl: string;
  caution: string;
};
