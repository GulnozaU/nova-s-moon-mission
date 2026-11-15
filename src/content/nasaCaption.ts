/**
 * Kid-facing NASA picture captions — no flare-class jargon, no ugly truncation.
 */

import type { NasaImage } from "./images";

/** Plain caption for a still. Storm slot notes when the picture is not today's storm. */
export function nasaKidCaption(
  image: NasaImage,
  opts?: { eventDate?: string | null },
): string {
  if (image.slot === "storm") {
    const picDate = "2014-03-29";
    const eventDate = opts?.eventDate?.slice(0, 10) ?? null;
    if (eventDate && eventDate !== picDate) {
      return `A past storm. Credit: ${shortCredit(image.credit)}`;
    }
    return `Sun storm · 29 Mar 2014. ${shortCredit(image.credit)}`;
  }
  return `${shortTitle(image.title)}. ${shortCredit(image.credit)}`;
}

function shortCredit(credit: string): string {
  return credit.replace(/^Image:\s*/i, "").trim();
}

function shortTitle(title: string): string {
  const cleaned = title
    .replace(/\bX-class\b/gi, "bright")
    .replace(/\bM-class\b/gi, "medium")
    .replace(/\bC-class\b/gi, "small")
    .replace(/\bEVA\b/g, "moonwalk")
    .replace(/\bMSC\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= 48) return cleaned;
  // Break on a word, never mid-token with a bare ellipsis cut.
  const words = cleaned.split(" ");
  let out = "";
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > 45) break;
    out = next;
  }
  return out || cleaned.slice(0, 45);
}
