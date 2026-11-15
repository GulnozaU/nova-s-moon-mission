import { describe, expect, it } from "vitest";
import { archivedSpaceWeather } from "../data/donki";
import { warningFromCmeSpeed } from "../data/warning";
import { MISSION_DAYS } from "../engine/constants";
import { STATIC_EVENTS } from "./events";
import { GLOSSARY } from "./glossary";
import { scheduleMissionEvents } from "./schedule";
import { buildStormEvent } from "./storm";

describe("glossary", () => {
  it("keeps every Space Word definition ≤15 words", () => {
    for (const entry of GLOSSARY) {
      const words = entry.definition.trim().split(/\s+/);
      expect(words.length, entry.id).toBeLessThanOrEqual(15);
    }
    const needed = ["radiation", "solar-flare", "storm-cloud", "battery", "sol"];
    for (const id of needed) {
      expect(GLOSSARY.find((g) => g.id === id), id).toBeDefined();
    }
  });
});

describe("static events (Section 5)", () => {
  it("includes every non-storm table event with benefit, cost, and effects", () => {
    const ids = [
      "lunar-dust",
      "delayed-message",
      "supply-drop",
      "greenhouse-experiment",
      "battery-surge",
    ];
    expect(STATIC_EVENTS.map((e) => e.id).sort()).toEqual(ids.sort());
    for (const event of STATIC_EVENTS) {
      expect(event.explanation.length).toBeGreaterThan(10);
      expect(event.optionA.benefit.trim()).not.toBe("");
      expect(event.optionA.cost.trim()).not.toBe("");
      expect(event.optionB.benefit.trim()).not.toBe("");
      expect(event.optionB.cost.trim()).not.toBe("");
      expect(event.realWorldNote.trim()).not.toBe("");
    }
  });
});

describe("storm from DONKI", () => {
  it("builds a storm card with real archived date and IDs", () => {
    const weather = archivedSpaceWeather("X");
    const built = buildStormEvent(weather, true);
    expect(built.event.sourceBadge).toBe("ARCHIVED");
    expect(built.event.eventDate).toBe("2024-05-03");
    expect(built.event.donkiFlareId).toBe("2024-05-03T02:11:00-FLR-001");
    expect(built.event.stormSeverity).toBe(3);
    expect(built.event.explanation).toContain("2024-05-03");
    expect(built.event.realWorldNote).toContain("2024-05-03T02:11:00-FLR-001");
  });

  it("places the storm after warning time", () => {
    const weather = archivedSpaceWeather("X");
    const speed = weather.fastestCme?.mostAccurateSpeedKmS ?? 841;
    const withComms = warningFromCmeSpeed(speed, true);
    const built = buildStormEvent(weather, true);
    expect(built.warningDays).toBe(withComms.warningDays);
    expect(built.stormDay).toBe(
      Math.min(MISSION_DAYS, Math.max(1, 1 + withComms.warningDays)),
    );

    const noComms = buildStormEvent(weather, false);
    expect(noComms.warningDays).toBe(warningFromCmeSpeed(speed, false).warningDays);
    expect(noComms.stormDay).toBeLessThanOrEqual(built.stormDay);
  });
});

describe("seeded schedule", () => {
  it("is deterministic for the same seed and puts storm on warning day", () => {
    const weather = archivedSpaceWeather("M");
    const a = scheduleMissionEvents(42, weather, true);
    const b = scheduleMissionEvents(42, weather, true);
    expect(a.days.map((d) => d.event.id)).toEqual(
      b.days.map((d) => d.event.id),
    );
    expect(a.stormDay).toBe(a.warningDays + 1 > 10 ? 10 : a.warningDays + 1);
    expect(a.days.find((d) => d.day === a.stormDay)?.event.id).toBe(
      "solar-storm",
    );
    expect(a.days).toHaveLength(10);
  });

  it("changes order when the seed changes", () => {
    const weather = archivedSpaceWeather("C");
    const a = scheduleMissionEvents(1, weather, true);
    const b = scheduleMissionEvents(99, weather, true);
    const idsA = a.days.filter((d) => d.event.id !== "solar-storm").map((d) => d.event.id);
    const idsB = b.days.filter((d) => d.event.id !== "solar-storm").map((d) => d.event.id);
    expect(idsA).not.toEqual(idsB);
  });
});
