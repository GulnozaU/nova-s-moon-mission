/**
 * Non-storm day events. Every card has two different options with a clear
 * benefit and cost; at least one path schedules pain 2+ days later.
 */

import type { Event } from "../types";
import { eventImageFor } from "./images";

/** Non-storm events scheduled by seed onto free days. */
export const STATIC_EVENTS: Event[] = [
  {
    id: "lunar-dust",
    title: "Moon dust in the water cleaner",
    sourceBadge: "REFERENCE",
    explanation:
      "Fine Moon dust blew into the water cleaner. Clean it now, or it stays clogged.",
    image: eventImageFor("dust"),
    optionA: {
      id: "clean-dust",
      label: "Clean it now",
      benefit: "Cleaner stays at full strength",
      cost: "Spend 1 material and 1 power",
      effects: {
        materials: -1,
        battery: -1,
        recyclerEfficiency: 1,
      },
    },
    optionB: {
      id: "skip-dust",
      label: "Skip cleaning",
      benefit: "Keep material and power today",
      cost: "Cleaner runs at half until you clean the filter",
      effects: {
        recyclerEfficiency: 0.5,
      },
    },
    realWorldNote:
      "Apollo astronauts said fine Moon dust stuck to suits and machines and was hard to clean.",
  },
  {
    id: "panel-dust",
    title: "Dust on the solar panels",
    sourceBadge: "REFERENCE",
    explanation:
      "Moon dust covers the panels. Wipe them now, or power drops later.",
    image: eventImageFor("title"),
    optionA: {
      id: "wipe-panels",
      label: "Wipe the panels",
      benefit: "Keep full power tomorrow",
      cost: "Spend 1 power and 1 material today",
      effects: {
        battery: -1,
        materials: -1,
      },
    },
    optionB: {
      id: "leave-dust",
      label: "Leave the dust",
      benefit: "Save power and materials today",
      cost: "In 2 days the battery loses 3 chips",
      effects: {
        delayed: {
          afterDays: 2,
          battery: -3,
          note: "Dust on the panels cut stored power.",
        },
      },
    },
    realWorldNote:
      "Lunar dust can stick to solar panels and cut how much light they catch.",
  },
  {
    id: "micrometeor-crack",
    title: "Crack in the greenhouse",
    sourceBadge: "STORY",
    explanation:
      "A tiny space rock cracked a greenhouse pane. Patch it, or air leaks later.",
    image: eventImageFor("greenhouse"),
    optionA: {
      id: "patch-crack",
      label: "Patch the pane",
      benefit: "Seal holds — no later air loss",
      cost: "Spend 2 materials now",
      effects: {
        materials: -2,
      },
    },
    optionB: {
      id: "delay-patch",
      label: "Wait to patch",
      benefit: "Keep materials today",
      cost: "In 3 days you lose 4 oxygen",
      effects: {
        delayed: {
          afterDays: 3,
          oxygen: -4,
          note: "The greenhouse crack let air leak out.",
        },
      },
    },
    realWorldNote:
      "Tiny rocks hit the Moon often. Real bases would need strong windows and quick repairs.",
  },
  {
    id: "icy-crater",
    title: "Rover trip to an icy crater",
    sourceBadge: "REFERENCE",
    explanation:
      "The rover can dig ice for water, but the trip uses power and adds risk.",
    image: eventImageFor("southPole"),
    optionA: {
      id: "dig-ice",
      label: "Dig for ice",
      benefit: "Gain 5 water",
      cost: "Spend 2 power and add 4 crew risk",
      effects: {
        water: 5,
        battery: -2,
        exposure: 4,
      },
    },
    optionB: {
      id: "stay-base",
      label: "Stay at the base",
      benefit: "No trip risk or power cost",
      cost: "In 2 days tanks feel the missed ice (−3 water)",
      effects: {
        delayed: {
          afterDays: 2,
          water: -3,
          note: "No ice haul — tanks ran lower.",
        },
      },
    },
    realWorldNote:
      "NASA studies icy craters near the Moon's south pole as a possible water source.",
  },
  {
    id: "tired-crew",
    title: "Tired crew",
    sourceBadge: "STORY",
    explanation:
      "The crew is worn out. Rest today, or push for science and pay later.",
    image: eventImageFor("equatorial"),
    optionA: {
      id: "rest-crew",
      label: "Rest today",
      benefit: "Crew risk drops a little",
      cost: "No science from this card",
      effects: {
        exposure: -2,
        scienceThatDay: 0,
      },
    },
    optionB: {
      id: "push-crew",
      label: "Push for science",
      benefit: "+3 science today",
      cost: "In 2 days crew risk jumps (+6)",
      effects: {
        science: 3,
        delayed: {
          afterDays: 2,
          exposure: 6,
          note: "The tired crew got more risk after pushing hard.",
        },
      },
    },
    realWorldNote:
      "Real crews need rest. Pushing too hard raises mistakes and health risk.",
  },
  {
    id: "water-leak",
    title: "Water leak",
    sourceBadge: "STORY",
    explanation:
      "A pipe is dripping. Patch it with one part, or lose more water.",
    image: eventImageFor("dust"),
    optionA: {
      id: "patch-leak",
      label: "Patch with 1 material",
      benefit: "Stop the leak",
      cost: "Spend 1 material",
      effects: {
        materials: -1,
      },
    },
    optionB: {
      id: "ignore-leak",
      label: "Ignore the drip",
      benefit: "Keep the material",
      cost: "Lose 3 water now, and 2 more in 2 days",
      effects: {
        water: -3,
        delayed: {
          afterDays: 2,
          water: -2,
          note: "The ignored leak kept dripping.",
        },
      },
    },
    realWorldNote:
      "Water is precious off Earth. Small leaks matter a lot on a real mission.",
  },
  {
    id: "air-fault",
    title: "Air machine fault",
    sourceBadge: "STORY",
    explanation:
      "The air maker sputters. Fix it now, or oxygen drops in a few days.",
    image: eventImageFor("title"),
    optionA: {
      id: "fix-air",
      label: "Fix it now",
      benefit: "Air maker stays ready",
      cost: "Spend 1 material and 1 power",
      effects: {
        materials: -1,
        battery: -1,
      },
    },
    optionB: {
      id: "delay-air-fix",
      label: "Run it broken",
      benefit: "Save parts and power today",
      cost: "In 3 days lose 5 oxygen",
      effects: {
        delayed: {
          afterDays: 3,
          oxygen: -5,
          note: "The broken air maker could not keep up.",
        },
      },
    },
    realWorldNote:
      "Life-support machines need spare parts. Games use simple numbers for that cost.",
  },
  {
    id: "delayed-message",
    title: "Delayed message from Earth",
    sourceBadge: "REFERENCE",
    explanation:
      "Mission Control's reply is slow. Wait for help, or decide alone.",
    image: eventImageFor("equatorial"),
    optionA: {
      id: "ask-earth",
      label: "Ask Earth for help",
      benefit: "Safer plan — avoid a later materials loss",
      cost: "Spend 1 power to keep the radio on",
      effects: {
        battery: -1,
      },
    },
    optionB: {
      id: "decide-alone",
      label: "Decide alone",
      benefit: "Save 1 power today",
      cost: "In 2 days a mistake costs 2 materials",
      effects: {
        delayed: {
          afterDays: 2,
          materials: -2,
          note: "A rushed call without Earth cost two building parts.",
        },
      },
    },
    realWorldNote:
      "A radio signal takes about 1.3 seconds to travel between Earth and the Moon.",
  },
  {
    id: "supply-drop",
    title: "Supply ship drops materials",
    sourceBadge: "STORY",
    explanation:
      "A story supply ship can leave building parts — if you stop science to unload.",
    image: eventImageFor("southPole"),
    optionA: {
      id: "take-supplies",
      label: "Take the materials",
      benefit: "Gain 3 materials",
      cost: "No science points today",
      effects: {
        materials: 3,
        scienceThatDay: 0,
      },
    },
    optionB: {
      id: "skip-supplies",
      label: "Keep working on science",
      benefit: "+2 science from staying on the work plan",
      cost: "In 2 days you miss a late restock (−2 materials)",
      effects: {
        science: 2,
        delayed: {
          afterDays: 2,
          materials: -2,
          note: "Skipping the drop meant fewer parts later.",
        },
      },
    },
    realWorldNote:
      "This supply drop is a story beat for the game, not a real NASA delivery to this base.",
  },
  {
    id: "battery-surge",
    title: "Battery surge",
    sourceBadge: "STORY",
    explanation:
      "Extra power is ready right now. Use it for science, or bank it carefully.",
    image: eventImageFor("title"),
    optionA: {
      id: "spend-surge",
      label: "Use the extra power now",
      benefit: "+2 science today",
      cost: "Lose 3 power now; in 2 days the surge fades (−2 battery)",
      effects: {
        science: 2,
        battery: -3,
        delayed: {
          afterDays: 2,
          battery: -2,
          note: "The power surge faded and left the battery lower.",
        },
      },
    },
    optionB: {
      id: "save-surge",
      label: "Save it to the battery",
      benefit: "+2 power stored",
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

/** True when both options share the same id/label (forbidden filler). */
export function optionsAreIdentical(event: Event): boolean {
  return (
    event.optionA.id === event.optionB.id ||
    event.optionA.label === event.optionB.label
  );
}

/**
 * True if option A is weakly better on every numeric effect field
 * (and delayed fields) than B — forbidden for fair trade-offs.
 */
export function optionDominates(event: Event): boolean {
  const keys = [
    "water",
    "oxygen",
    "materials",
    "battery",
    "science",
    "exposure",
    "shieldLevel",
    "panelBonus",
    "scienceThatDay",
    "recyclerEfficiency",
  ] as const;

  const a = event.optionA.effects;
  const b = event.optionB.effects;

  let aBetter = false;
  let bBetter = false;

  for (const key of keys) {
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;
    // Higher is better except exposure (lower is better).
    if (key === "exposure") {
      if (av < bv) aBetter = true;
      if (bv < av) bBetter = true;
    } else {
      if (av > bv) aBetter = true;
      if (bv > av) bBetter = true;
    }
  }

  const ad = a.delayed;
  const bd = b.delayed;
  const delayScore = (d: typeof ad) => {
    if (!d) return 0;
    // Negative delayed totals are costs; sum signed impact (exposure inverted).
    return (
      (d.water ?? 0) +
      (d.oxygen ?? 0) +
      (d.materials ?? 0) +
      (d.battery ?? 0) -
      (d.exposure ?? 0)
    );
  };
  const as = delayScore(ad);
  const bs = delayScore(bd);
  if (as > bs) aBetter = true;
  if (bs > as) bBetter = true;

  // Dominates if one side has all advantages and the other has none.
  return (aBetter && !bBetter) || (bBetter && !aBetter);
}
