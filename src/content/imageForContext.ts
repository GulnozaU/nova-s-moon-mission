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

/** Rotate through every bundled still so the frame never feels stuck. */
export function nasaImageForDay(day: number): NasaImage {
  const slots = listNasaImages().map((i) => i.slot);
  const pool = slots.length > 0 ? slots : DAY_ROTATION;
  const slot = pool[Math.abs(day - 1) % pool.length]!;
  return getNasaImage(slot);
}

/**
 * Event-aware pick that still changes across days when events share a theme.
 * Uses day offset so two storm days do not always show the identical crop feel.
 */
export function nasaImageForPlay(day: number, eventId?: string | null): NasaImage {
  if (!eventId) return nasaImageForDay(day);
  const primary = slotForContext(eventId, day);
  // On even days with a mapped event, occasionally show the day-rotation neighbor
  // so the gallery feels alive — but keep event match as default.
  if (day % 3 === 0) {
    const alt = DAY_ROTATION[Math.abs(day) % DAY_ROTATION.length]!;
    if (alt !== primary) return getNasaImage(alt);
  }
  return getNasaImage(primary);
}

function slotForContext(context: string, day: number): ImageSlot {
  const c = context.toLowerCase();
  if (c === "title" || c.includes("welcome") || c.includes("earth")) return "title";
  if (c.includes("dust") || c === "lunar-dust") return "dust";
  if (
    c.includes("green") ||
    c.includes("plant") ||
    c === "greenhouse-experiment"
  ) {
    return "greenhouse";
  }
  if (c.includes("rim") || c.includes("south") || c === "southpole") return "southPole";
  if (c === "supply-drop") return "equatorial";
  if (c === "battery-surge") return "title";
  if (c === "delayed-message" || c.includes("radio") || c.includes("comms")) {
    return "equatorial";
  }
  if (
    c.includes("storm") ||
    c === "solar-storm" ||
    c === "why-radiation-matters"
  ) {
    return "storm";
  }
  // Generic weather / unknown — rotate by day (do NOT stick on storm forever).
  if (c === "weather" || c.includes("sun")) {
    return DAY_ROTATION[Math.abs(day - 1) % DAY_ROTATION.length]!;
  }
  if (c.includes("plain") || c.includes("equator")) return "equatorial";
  return DAY_ROTATION[Math.abs(day - 1) % DAY_ROTATION.length]!;
}
