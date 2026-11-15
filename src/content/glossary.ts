/**
 * Space Words (SPEC 6c). Every definition is ≤ 15 words.
 */

export type GlossaryEntry = {
  id: string;
  term: string;
  /** Kid-facing definition, 15 words or fewer. */
  definition: string;
  pictureSrc: string;
  aliases?: string[];
};

function wordCount(def: string): number {
  return def.trim().split(/\s+/).filter(Boolean).length;
}

const I = {
  sun: "/art/sun.png",
  wind: "/art/wind.png",
  battery: "/art/battery.png",
  calendar: "/art/calendar-days.png",
  zap: "/art/zap.png",
  water: "/art/droplet.png",
  leaf: "/art/leaf.png",
  shield: "/art/shield-check.png",
  heart: "/art/heart.png",
  greenhouse: "/art/cutouts/greenhouse-dome.png",
  habitat: "/art/cutouts/habitat-dome.png",
  crates: "/art/cutouts/supply-crates.png",
};

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "radiation",
    term: "radiation",
    definition: "Invisible energy from the Sun that can harm the body.",
    pictureSrc: I.sun,
  },
  {
    id: "solar-flare",
    term: "solar flare",
    definition: "A bright burst of energy on the Sun.",
    pictureSrc: I.sun,
    aliases: ["flare"],
  },
  {
    id: "storm-cloud",
    term: "storm cloud",
    definition: "A big cloud of Sun stuff racing through space.",
    pictureSrc: I.wind,
    aliases: ["CME"],
  },
  {
    id: "battery",
    term: "battery",
    definition: "A box that stores leftover power for later.",
    pictureSrc: I.battery,
  },
  {
    id: "sol",
    term: "sol",
    definition: "One day on the Moon, counted like an Earth day.",
    pictureSrc: I.calendar,
  },
  {
    id: "power",
    term: "power",
    definition: "Energy chips from the Sun that run base machines.",
    pictureSrc: I.zap,
    aliases: ["power chips"],
  },
  {
    id: "water-cleaner",
    term: "water cleaner",
    definition: "A machine that saves water so tanks last longer.",
    pictureSrc: I.water,
    aliases: ["recycler"],
  },
  {
    id: "air-maker",
    term: "air maker",
    definition: "A machine that makes oxygen for the crew to breathe.",
    pictureSrc: I.leaf,
    aliases: ["oxygen maker"],
  },
  {
    id: "oxygen",
    term: "oxygen",
    definition: "The air gas people need to breathe and stay alive.",
    pictureSrc: I.leaf,
  },
  {
    id: "shield",
    term: "shield",
    definition: "Extra walls that lower how much storm energy hits you.",
    pictureSrc: I.shield,
  },
  {
    id: "greenhouse",
    term: "greenhouse",
    definition: "A plant room that can make a little food and oxygen.",
    pictureSrc: I.greenhouse,
  },
  {
    id: "crew-safety",
    term: "crew safety",
    definition: "How safe people feel from storm energy outside.",
    pictureSrc: I.heart,
    aliases: ["exposure"],
  },
  {
    id: "science",
    term: "science",
    definition: "Points you earn by exploring and running careful tests.",
    pictureSrc: I.zap,
  },
  {
    id: "materials",
    term: "materials",
    definition: "Building parts used to make shields or solar panels.",
    pictureSrc: I.crates,
    aliases: ["parts"],
  },
  {
    id: "shelter",
    term: "shelter",
    definition: "Going inside so storm energy hurts the crew less.",
    pictureSrc: I.habitat,
  },
];

/** Words that could not stay ≤15 (should be empty). */
export const GLOSSARY_OVER_15: string[] = GLOSSARY.filter(
  (g) => wordCount(g.definition) > 15,
).map((g) => `${g.term} (${wordCount(g.definition)} words)`);

export function getGlossaryTerm(idOrTerm: string): GlossaryEntry | undefined {
  const key = idOrTerm.trim().toLowerCase();
  return GLOSSARY.find(
    (e) =>
      e.id === key ||
      e.term.toLowerCase() === key ||
      e.aliases?.some((a) => a.toLowerCase() === key),
  );
}

export function glossaryMatchTerms(): string[] {
  const terms = new Set<string>();
  for (const g of GLOSSARY) {
    terms.add(g.term);
    for (const a of g.aliases ?? []) terms.add(a);
  }
  return [...terms].sort((a, b) => b.length - a.length);
}
