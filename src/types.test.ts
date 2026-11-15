import { describe, expect, it } from "vitest";
import type { Event, GameState, SourceBadge } from "./types";

describe("types smoke", () => {
  it("accepts a GameState shaped object", () => {
    const state: GameState = {
      day: 1,
      site: "rim",
      battery: 0,
      water: 40,
      oxygen: 30,
      materials: 10,
      shieldLevel: 0,
      panelBonus: 0,
      exposure: 0,
      science: 0,
      log: [],
    };
    expect(state.day).toBe(1);
  });

  it("lists the five provenance badges", () => {
    const badges: SourceBadge[] = [
      "LIVE",
      "ARCHIVED",
      "REFERENCE",
      "ASSUMPTION",
      "STORY",
    ];
    expect(badges).toHaveLength(5);
  });

  it("accepts an Event shaped object", () => {
    const event: Event = {
      id: "solar-storm",
      title: "Solar storm",
      sourceBadge: "ARCHIVED",
      explanation: "A storm from the Sun is coming.",
      optionA: {
        id: "shelter",
        label: "Shelter",
        benefit: "Stay safer",
        cost: "No science today",
        effects: { sheltered: true, scienceThatDay: 0 },
      },
      optionB: {
        id: "stay-out",
        label: "Stay out",
        benefit: "Keep science",
        cost: "More storm energy",
        effects: { sheltered: false },
      },
      realWorldNote: "NASA watches the Sun for storms.",
    };
    expect(event.optionA.id).toBe("shelter");
  });
});
