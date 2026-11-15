/**
 * Space Words drawer entries (SPEC 6c / Prompt 3).
 * Each definition is ≤ 15 words for ages 7–12.
 */

export type GlossaryEntry = {
  id: string;
  term: string;
  /** Kid-facing definition, 15 words or fewer. */
  definition: string;
  /** Optional picture key for later UI art. */
  pictureHint: string;
};

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "radiation",
    term: "radiation",
    definition: "Invisible energy from the Sun that can harm the body.",
    pictureHint: "sun-rays",
  },
  {
    id: "solar-flare",
    term: "solar flare",
    definition: "A bright burst of energy on the Sun.",
    pictureHint: "sun-burst",
  },
  {
    id: "cme",
    term: "CME",
    definition: "A big cloud of Sun stuff racing through space.",
    pictureHint: "storm-cloud",
  },
  {
    id: "battery",
    term: "battery",
    definition: "A box that stores leftover power for later.",
    pictureHint: "battery",
  },
  {
    id: "sol",
    term: "sol",
    definition: "One day on the Moon or Mars, counted like Earth days.",
    pictureHint: "moon-day",
  },
];

export function getGlossaryTerm(idOrTerm: string): GlossaryEntry | undefined {
  const key = idOrTerm.trim().toLowerCase();
  return GLOSSARY.find(
    (e) => e.id === key || e.term.toLowerCase() === key,
  );
}
