/**
 * Section 5 event table (static templates).
 * Storm cards are built at runtime from DONKI — see storm.ts.
 */

import type { Event } from "../types";

/** Non-storm events scheduled by seed onto free days. */
export const STATIC_EVENTS: Event[] = [
  {
    id: "lunar-dust",
    title: "Lunar dust in the recycler",
    sourceBadge: "REFERENCE",
    explanation:
      "Fine Moon dust blew into the water cleaner. It may clog the machine.",
    optionA: {
      id: "clean-dust",
      label: "Clean it now",
      benefit: "Recycler stays at full strength",
      cost: "Spend 1 material and 1 power from the battery",
      effects: {
        materials: -1,
        battery: -1,
        recyclerEfficiency: 1,
      },
    },
    optionB: {
      id: "skip-dust",
      label: "Skip cleaning",
      benefit: "Keep your material and power",
      cost: "Recycler works at half strength until you clean it",
      effects: {
        recyclerEfficiency: 0.5,
      },
    },
    // Apollo dust problems are well documented (suits, seals, equipment).
    realWorldNote:
      "Apollo astronauts said fine Moon dust stuck to suits and machines and was hard to clean.",
  },
  {
    id: "delayed-message",
    title: "Delayed message from Earth",
    sourceBadge: "REFERENCE",
    explanation:
      "Mission Control's reply takes a moment. Do you wait for help or decide alone?",
    optionA: {
      id: "ask-earth",
      label: "Ask Earth for help",
      benefit: "A safer choice with advice from Earth",
      cost: "Spend 1 power from the battery to keep the radio on",
      effects: {
        battery: -1,
      },
    },
    optionB: {
      id: "decide-alone",
      label: "Decide alone",
      benefit: "Save 1 power",
      cost: "1 in 4 chance of a mistake that costs 2 materials",
      effects: {
        riskChance: 0.25,
        riskMaterials: -2,
      },
    },
    // One-way light time Earth–Moon ≈ 1.28 s; "about 1.3 s" is standard education wording.
    realWorldNote:
      "A radio signal takes about 1.3 seconds to travel between Earth and the Moon.",
  },
  {
    id: "supply-drop",
    title: "Supply ship drops materials",
    sourceBadge: "STORY",
    explanation:
      "A story supply ship can leave building parts — if you stop science to unload.",
    optionA: {
      id: "take-supplies",
      label: "Take the materials",
      benefit: "Gain 3 materials for shields or panels",
      cost: "No science points today",
      effects: {
        materials: 3,
        scienceThatDay: 0,
      },
    },
    optionB: {
      id: "skip-supplies",
      label: "Keep working on science",
      benefit: "Keep today's science plan",
      cost: "No new materials from the drop",
      effects: {},
    },
    realWorldNote:
      "This supply drop is a story beat for the game, not a real NASA delivery to this base.",
  },
  {
    id: "greenhouse-experiment",
    title: "Greenhouse experiment",
    sourceBadge: "OSDR",
    explanation:
      "The plant trays need water today. Watering helps plants, but tanks go down faster.",
    optionA: {
      id: "water-plants",
      label: "Water the plants",
      benefit: "+1 oxygen and +1 science from the plants",
      cost: "2 water leave your tanks (and you still need power for the greenhouse)",
      effects: {
        water: -2,
        oxygen: 1,
        science: 1,
      },
    },
    optionB: {
      id: "save-water",
      label: "Save the water",
      benefit: "Tanks stay fuller",
      cost: "No plant oxygen or science bonus today",
      effects: {},
    },
    // Generic true claim until Prompt 3b wires a specific OSDR study finding.
    realWorldNote:
      "NASA's OSDR archive holds real space-biology experiments on plants grown off Earth.",
  },
  {
    id: "battery-surge",
    title: "Battery surge",
    sourceBadge: "STORY",
    explanation:
      "Extra power is ready right now. Use it for science, or save it for later.",
    optionA: {
      id: "spend-surge",
      label: "Use the extra power now",
      benefit: "+2 science today",
      cost: "Lose 3 power from the battery",
      effects: {
        science: 2,
        battery: -3,
      },
    },
    optionB: {
      id: "save-surge",
      label: "Save it to the battery",
      benefit: "+2 power stored for night or busy days",
      cost: "Nothing gained for science today",
      effects: {
        battery: 2,
      },
    },
    realWorldNote:
      "This battery surge is a game story, not a report of a real spacecraft fault.",
  },
];

export const STATIC_EVENT_IDS = STATIC_EVENTS.map((e) => e.id);

export function getStaticEvent(id: string): Event | undefined {
  return STATIC_EVENTS.find((e) => e.id === id);
}
