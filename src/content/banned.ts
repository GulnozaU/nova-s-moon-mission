/**
 * SPEC 6e — never show these on a card unless already taught.
 * Prefer the plain replacements in UI copy.
 */

export const BANNED_TERMS = [
  "class M",
  "class C",
  "class X",
  "CME",
  "SEP",
  "radiation dose",
  "microgravity",
  "illumination",
  "ECLSS",
  "DONKI",
] as const;

export const PLAIN_SWAPS: Array<{ hard: RegExp; plain: string }> = [
  { hard: /\bCME\b/gi, plain: "storm cloud" },
  { hard: /\bSEP\b/gi, plain: "storm bits" },
  { hard: /\bECLSS\b/gi, plain: "life support" },
  { hard: /\bmicrogravity\b/gi, plain: "almost no weight" },
  { hard: /\billumination\b/gi, plain: "sunlight" },
  { hard: /\bradiation dose\b/gi, plain: "storm energy on the body" },
  { hard: /\bDONKI\b/gi, plain: "NASA's storm watch" },
  { hard: /\bclass\s+[CMX]\d*(?:\.\d+)?\b/gi, plain: "storm size" },
];

/** Soften hard jargon for kid-facing cards. */
export function plainTalk(text: string): string {
  let out = text;
  for (const swap of PLAIN_SWAPS) {
    out = out.replace(swap.hard, swap.plain);
  }
  return out;
}
