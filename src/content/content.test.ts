import { describe, expect, it } from "vitest";
import { archivedSpaceWeather } from "../data/donki";
import { warningFromCmeSpeed } from "../data/warning";
import { MISSION_DAYS } from "../engine/constants";
import { STATIC_EVENTS, optionsAreIdentical } from "./events";
import { GLOSSARY } from "./glossary";
import { scheduleMissionEvents, stormAlertsForDay } from "./schedule";
import { buildStormEvent, buildStormEventAtDay } from "./storm";

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
  it("every non-storm event has distinct options with benefit and cost", () => {
    expect(STATIC_EVENTS.length).toBeGreaterThanOrEqual(7);
    for (const event of STATIC_EVENTS) {
      expect(optionsAreIdentical(event), event.id).toBe(false);
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

  it("places legacy storm after warning time", () => {
    const weather = archivedSpaceWeather("X");
    const speed = weather.fastestCme?.mostAccurateSpeedKmS ?? 841;
    const withComms = warningFromCmeSpeed(speed, true);
    const built = buildStormEvent(weather, true);
    expect(built.warningDays).toBe(withComms.warningDays);
    expect(built.stormDay).toBe(
      Math.min(MISSION_DAYS, Math.max(1, 1 + withComms.warningDays)),
    );

    const noComms = buildStormEvent(weather, false);
    expect(noComms.warningDays).toBe(
      warningFromCmeSpeed(speed, false).warningDays,
    );
    expect(noComms.stormDay).toBeLessThanOrEqual(built.stormDay);
  });

  it("buildStormEventAtDay keeps DONKI ids on a fixed day", () => {
    const weather = archivedSpaceWeather("M");
    const built = buildStormEventAtDay(weather, 5);
    expect(built.stormDay).toBe(5);
    expect(built.event.donkiFlareId).toBeTruthy();
    expect(built.event.eventDate).toBeTruthy();
  });
});

describe("seeded schedule", () => {
  it("is deterministic and puts storms on day 4|5 and 8|9", () => {
    const weather = archivedSpaceWeather("M");
    const a = scheduleMissionEvents(42, weather, true);
    const b = scheduleMissionEvents(42, weather, true);
    expect(a.days.map((d) => d.event.id)).toEqual(
      b.days.map((d) => d.event.id),
    );
    expect(a.stormDays).toHaveLength(2);
    expect([4, 5]).toContain(a.stormDays[0]);
    expect([8, 9]).toContain(a.stormDays[1]);
    expect(a.days).toHaveLength(10);
    for (const slot of a.days) {
      expect(slot.event.optionA.label).not.toBe(slot.event.optionB.label);
    }
  });

  it("changes order when the seed changes", () => {
    const weather = archivedSpaceWeather("C");
    const a = scheduleMissionEvents(1, weather, true);
    const b = scheduleMissionEvents(99, weather, true);
    const idsA = a.days.map((d) => d.event.id);
    const idsB = b.days.map((d) => d.event.id);
    expect(idsA).not.toEqual(idsB);
  });

  it("comms ON shows longer storm alerts than OFF", () => {
    const weather = archivedSpaceWeather("X");
    const sched = scheduleMissionEvents(7, weather);
    const storm = sched.storms[0]!;
    const day = Math.max(1, storm.day - storm.warningDays);
    const on = stormAlertsForDay(sched, day, true);
    const off = stormAlertsForDay(sched, day, false);
    expect(on.length).toBeGreaterThanOrEqual(off.length);
    if (storm.warningDays >= 2) {
      expect(on.some((a) => a.stormDay === storm.day)).toBe(true);
    }
  });
});
