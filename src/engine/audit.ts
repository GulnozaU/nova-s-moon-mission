/**
 * Every player-facing decision from SPEC Section 3.9 as structured data.
 * Benefit and cost must both be non-empty (Prompt 1b).
 */

export type DecisionMeasure = {
  /** Higher is better for the player on this axis. */
  power: number;
  water: number;
  oxygen: number;
  materials: number;
  /** Higher = safer (less exposure). */
  safety: number;
  science: number;
};

export type AuditedOption = {
  id: string;
  label: string;
  benefit: string;
  cost: string;
  costLater: string;
  teaches: string;
  /** Relative scores used for dominance checks (not engine deltas). */
  measures: DecisionMeasure;
};

export type AuditedDecisionGroup = {
  id: string;
  title: string;
  options: AuditedOption[];
};

/**
 * Section 3.9 table → grouped options.
 * Mutually exclusive choices share a group so we can test "no dominant option".
 */
export const DECISION_AUDIT: AuditedDecisionGroup[] = [
  {
    id: "site",
    title: "Pick a build site",
    options: [
      {
        id: "site-rim",
        label: "Build at the rim site",
        benefit: "Steady sunlight almost every day",
        cost: "Rough ground — science gives only 1.5 points per level",
        costLater: "Harder to expand power and science fast",
        teaches: "Where you build decides your power",
        measures: {
          power: 3,
          water: 0,
          oxygen: 0,
          materials: 0,
          safety: 0,
          science: 1,
        },
      },
      {
        id: "site-plain",
        label: "Build at the plain site",
        benefit: "Easy ground — science gives 2 points per level",
        cost: "No power on night days",
        costLater: "Must store power in the battery for night",
        teaches: "The Moon has long days and long nights",
        measures: {
          power: 1,
          water: 0,
          oxygen: 0,
          materials: 0,
          safety: 0,
          science: 3,
        },
      },
    ],
  },
  {
    id: "recycler",
    title: "Run the recycler",
    options: [
      {
        id: "recycler-on",
        label: "Run the recycler",
        benefit: "Water loss drops from 4 to 1 per day",
        cost: "2 power chips",
        costLater: "Less power left for science",
        teaches: "Recycling saves supplies but needs energy",
        measures: {
          power: -2,
          water: 3,
          oxygen: 0,
          materials: 0,
          safety: 0,
          science: -1,
        },
      },
      {
        id: "recycler-off",
        label: "Leave the recycler off",
        benefit: "Save 2 power for other systems",
        cost: "Water loss stays at 4 per day",
        costLater: "Tanks run low sooner — Day 8 gets hard",
        teaches: "Skipping the cleaner spends water instead of power",
        measures: {
          power: 2,
          water: -3,
          oxygen: 0,
          materials: 0,
          safety: 0,
          science: 1,
        },
      },
    ],
  },
  {
    id: "oxygen-maker",
    title: "Run the oxygen maker",
    options: [
      {
        id: "oxygen-on",
        label: "Run the oxygen maker",
        benefit: "+3 oxygen",
        cost: "2 power and 1 water",
        costLater: "Water runs lower",
        teaches: "Air can be made from water, with electricity",
        measures: {
          power: -2,
          water: -1,
          oxygen: 3,
          materials: 0,
          safety: 1,
          science: 0,
        },
      },
      {
        id: "oxygen-off",
        label: "Leave the oxygen maker off",
        benefit: "Save 2 power and 1 water",
        cost: "No +3 oxygen today",
        costLater: "Crew air can run out",
        teaches: "Oxygen does not refill itself",
        measures: {
          power: 2,
          water: 1,
          oxygen: -3,
          materials: 0,
          safety: -1,
          science: 0,
        },
      },
    ],
  },
  {
    id: "comms",
    title: "Keep comms on",
    options: [
      {
        id: "comms-on",
        label: "Keep comms on",
        benefit: "Full storm warning time from Earth",
        cost: "1 power chip",
        costLater: "Less power for science",
        teaches: "Talking to Earth costs energy",
        measures: {
          power: -1,
          water: 0,
          oxygen: 0,
          materials: 0,
          safety: 2,
          science: -1,
        },
      },
      {
        id: "comms-off",
        label: "Turn comms off",
        benefit: "Save 1 power chip",
        cost: "Storm warning time is cut in half",
        costLater: "Less time to prepare for a storm",
        teaches: "Silence saves power but shortens warnings",
        measures: {
          power: 1,
          water: 0,
          oxygen: 0,
          materials: 0,
          safety: -2,
          science: 1,
        },
      },
    ],
  },
  {
    id: "science",
    title: "Do science",
    options: [
      {
        id: "science-on",
        label: "Do science (per level)",
        benefit: "+2 science points per level (1.5 at the rim)",
        cost: "1 power per level; crew goes outside",
        costLater: "More exposure on storm days",
        teaches: "Research needs energy and time outside",
        measures: {
          power: -1,
          water: 0,
          oxygen: 0,
          materials: 0,
          safety: -2,
          science: 3,
        },
      },
      {
        id: "science-off",
        label: "Skip science today",
        benefit: "Save power and stay safer inside",
        cost: "No science points today",
        costLater: "Fall behind on the mission score",
        teaches: "Progress costs risk",
        measures: {
          power: 1,
          water: 0,
          oxygen: 0,
          materials: 0,
          safety: 2,
          science: -3,
        },
      },
    ],
  },
  {
    id: "greenhouse",
    title: "Run the greenhouse",
    options: [
      {
        id: "greenhouse-on",
        label: "Run the greenhouse",
        benefit: "+1 oxygen and +2 science",
        cost: "1 power and 1 water",
        costLater: "Tanks drain faster",
        teaches: "Plants help, but they need resources",
        measures: {
          power: -1,
          water: -1,
          oxygen: 1,
          materials: 0,
          safety: 0,
          science: 2,
        },
      },
      {
        id: "greenhouse-off",
        label: "Leave the greenhouse off",
        benefit: "Save 1 power and 1 water",
        cost: "No plant oxygen or science bonus",
        costLater: "Miss the biology research path",
        teaches: "Skipping plants keeps tanks fuller",
        measures: {
          power: 1,
          water: 1,
          oxygen: -1,
          materials: 0,
          safety: 0,
          science: -2,
        },
      },
    ],
  },
  {
    id: "shield",
    title: "Build a shield level",
    options: [
      {
        id: "build-shield",
        label: "Build a shield level",
        benefit: "20 percent less storm exposure",
        cost: "2 materials",
        costLater: "Fewer materials left for solar panels",
        teaches: "Protection costs building materials",
        measures: {
          power: 0,
          water: 0,
          oxygen: 0,
          materials: -2,
          safety: 3,
          science: 0,
        },
      },
      {
        id: "skip-shield",
        label: "Do not build a shield",
        benefit: "Keep 2 materials",
        cost: "No extra storm protection",
        costLater: "Storms hit the crew harder",
        teaches: "Saving materials leaves you more open to storms",
        measures: {
          power: 0,
          water: 0,
          oxygen: 0,
          materials: 2,
          safety: -3,
          science: 0,
        },
      },
    ],
  },
  {
    id: "panel",
    title: "Build a solar panel",
    options: [
      {
        id: "build-panel",
        label: "Build a solar panel",
        benefit: "+1 power every day (permanent)",
        cost: "3 materials",
        costLater: "Less shielding you can afford",
        teaches: "Investing early pays off later",
        measures: {
          power: 3,
          water: 0,
          oxygen: 0,
          materials: -3,
          safety: -1,
          science: 1,
        },
      },
      {
        id: "skip-panel",
        label: "Do not build a panel",
        benefit: "Keep 3 materials for shields or later",
        cost: "No permanent power boost",
        costLater: "Nights and busy days stay tighter",
        teaches: "Skipping panels keeps materials but not power growth",
        measures: {
          power: -3,
          water: 0,
          oxygen: 0,
          materials: 3,
          safety: 1,
          science: -1,
        },
      },
    ],
  },
  {
    id: "storm",
    title: "Shelter in a storm",
    options: [
      {
        id: "shelter",
        label: "Shelter in a storm",
        benefit: "Exposure stays low",
        cost: "No science that day",
        costLater: "Falling behind on score",
        teaches: "Safety versus progress",
        measures: {
          power: 0,
          water: 0,
          oxygen: 0,
          materials: 0,
          safety: 3,
          science: -3,
        },
      },
      {
        id: "stay-out",
        label: "Stay out in a storm",
        benefit: "Keep today's science",
        cost: "Exposure rises a lot",
        costLater: "Crew safety bar can hit the limit",
        teaches: "Working outside in a storm is risky",
        measures: {
          power: 0,
          water: 0,
          oxygen: 0,
          materials: 0,
          safety: -3,
          science: 3,
        },
      },
    ],
  },
];

const MEASURE_KEYS: (keyof DecisionMeasure)[] = [
  "power",
  "water",
  "oxygen",
  "materials",
  "safety",
  "science",
];

/** True if `a` is >= `b` on every measure and > on at least one. */
export function dominates(a: DecisionMeasure, b: DecisionMeasure): boolean {
  let strictlyBetter = false;
  for (const key of MEASURE_KEYS) {
    if (a[key] < b[key]) return false;
    if (a[key] > b[key]) strictlyBetter = true;
  }
  return strictlyBetter;
}

export function findEmptyBenefitOrCost(): string[] {
  const problems: string[] = [];
  for (const group of DECISION_AUDIT) {
    for (const opt of group.options) {
      if (!opt.benefit.trim()) {
        problems.push(`${group.id}/${opt.id}: empty benefit`);
      }
      if (!opt.cost.trim()) {
        problems.push(`${group.id}/${opt.id}: empty cost`);
      }
      if (!opt.costLater.trim()) {
        problems.push(`${group.id}/${opt.id}: empty costLater`);
      }
    }
  }
  return problems;
}

export function findDominantPairs(): string[] {
  const problems: string[] = [];
  for (const group of DECISION_AUDIT) {
    const opts = group.options;
    for (let i = 0; i < opts.length; i++) {
      for (let j = 0; j < opts.length; j++) {
        if (i === j) continue;
        if (dominates(opts[i]!.measures, opts[j]!.measures)) {
          problems.push(
            `${group.id}: ${opts[i]!.id} dominates ${opts[j]!.id}`,
          );
        }
      }
    }
  }
  return problems;
}
