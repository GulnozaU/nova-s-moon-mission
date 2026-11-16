export type PlaceId = "surface" | "home" | "greenhouse" | "lab";

export type CrewSpeaker = {
  id: string;
  name: string;
  place: PlaceId;
  /** 1–2 short lines (≈12 words each). */
  lines: string[];
};

export const CREW: Record<PlaceId, CrewSpeaker> = {
  surface: {
    id: "mission-control",
    name: "Mission Control",
    place: "surface",
    lines: [
      "Nova, check each building before you rest.",
      "Radio on today means a storm warning tomorrow.",
    ],
  },
  home: {
    id: "sam",
    name: "Sam",
    place: "home",
    lines: [
      "I'm Sam. I keep the cleaner and air maker running.",
      "Stand on a machine to switch it. Bed ends the day.",
    ],
  },
  greenhouse: {
    id: "mira",
    name: "Mira",
    place: "greenhouse",
    lines: [
      "I'm Mira. Plants need power and a little water.",
      "Water them when you can — they give oxygen and science.",
    ],
  },
  lab: {
    id: "ana",
    name: "Dr. Ana",
    place: "lab",
    lines: [
      "I'm Dr. Ana. I watch the storm data from Earth.",
      "Plan a science walk here, then go outside carefully.",
    ],
  },
};

const seenKey = "nova-crew-seen";

export function hasMetCrew(place: PlaceId): boolean {
  try {
    const raw = sessionStorage.getItem(seenKey);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, boolean>;
    return Boolean(map[place]);
  } catch {
    return false;
  }
}

export function markCrewMet(place: PlaceId) {
  try {
    const raw = sessionStorage.getItem(seenKey);
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    map[place] = true;
    sessionStorage.setItem(seenKey, JSON.stringify(map));
  } catch {
    /* */
  }
}
