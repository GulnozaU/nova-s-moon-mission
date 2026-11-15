import type { ImageSlot } from "./images";
import { getNasaImage, listNasaImages, type NasaImage } from "./images";

const DAY_ROTATION: ImageSlot[] = [
  "title",
  "storm",
  "southPole",
  "equatorial",
  "dust",
  "greenhouse",
];

/** Pick the NASA still that matches what the kid is looking at. */
export function nasaImageForContext(
  context:
    | "title"
    | "weather"
    | "storm"
    | "dust"
    | "greenhouse"
    | "southPole"
    | "equatorial"
    | "site-rim"
    | "site-plain"
    | string,
  day = 1,
): NasaImage {
  const slot = slotForContext(context, day);
  return getNasaImage(slot);
}

/** Rotate through every bundled still so the sidebar does not feel stuck. */
export function nasaImageForDay(day: number): NasaImage {
  const slots = listNasaImages().map((i) => i.slot);
  const pool = slots.length > 0 ? slots : DAY_ROTATION;
  const slot = pool[Math.abs(day - 1) % pool.length]!;
  return getNasaImage(slot);
}

function slotForContext(context: string, day: number): ImageSlot {
  const c = context.toLowerCase();
  if (c === "title" || c.includes("welcome") || c.includes("earth")) return "title";
  if (c.includes("dust") || c === "lunar-dust") return "dust";
  if (
    c.includes("green") ||
    c.includes("plant") ||
    c === "greenhouse-experiment" ||
    c.includes("water")
  ) {
    return "greenhouse";
  }
  if (c.includes("rim") || c.includes("south") || c === "southpole") return "southPole";
  if (
    c.includes("plain") ||
    c.includes("equator") ||
    c === "supply-drop" ||
    c === "battery-surge"
  ) {
    return "equatorial";
  }
  if (c === "delayed-message" || c.includes("radio") || c.includes("comms")) {
    return "equatorial";
  }
  if (
    c.includes("storm") ||
    c.includes("sun") ||
    c === "solar-storm" ||
    c === "why-radiation-matters" ||
    c === "weather"
  ) {
    return "storm";
  }
  // Unknown / quiet day — still change with the mission day.
  return DAY_ROTATION[Math.abs(day - 1) % DAY_ROTATION.length]!;
}
