import type { ImageSlot } from "./images";
import { getNasaImage, type NasaImage } from "./images";

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
): NasaImage {
  const slot = slotForContext(context);
  return getNasaImage(slot);
}

function slotForContext(context: string): ImageSlot {
  const c = context.toLowerCase();
  if (c === "title" || c.includes("welcome") || c.includes("earth")) return "title";
  if (c.includes("dust") || c === "lunar-dust") return "dust";
  if (c.includes("green") || c.includes("plant") || c === "greenhouse-experiment")
    return "greenhouse";
  if (c.includes("rim") || c.includes("south") || c === "southpole") return "southPole";
  if (c.includes("plain") || c.includes("equator")) return "equatorial";
  if (
    c.includes("storm") ||
    c.includes("weather") ||
    c.includes("sun") ||
    c === "solar-storm" ||
    c === "why-radiation-matters"
  ) {
    return "storm";
  }
  return "title";
}
