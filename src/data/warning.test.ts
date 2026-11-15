import { describe, expect, it } from "vitest";
import { warningFromCmeSpeed } from "./warning";

describe("warningFromCmeSpeed", () => {
  it("matches the SPEC example: 1000 km/s ≈ 41 hours → 1 warning day", () => {
    const withComms = warningFromCmeSpeed(1000, true);
    expect(withComms.hours).toBeCloseTo(149_600_000 / 1000 / 3600, 10);
    expect(withComms.hours).toBeGreaterThan(41);
    expect(withComms.hours).toBeLessThan(42);
    expect(withComms.warningDays).toBe(1);
  });

  it("halves warning days when comms are off", () => {
    // 500 km/s → ~83.1 h → floor 3 days; without comms floor(3/2)=1
    const on = warningFromCmeSpeed(500, true);
    const off = warningFromCmeSpeed(500, false);
    expect(on.warningDays).toBe(3);
    expect(off.warningDays).toBe(1);
  });

  it("returns 0 for non-positive speed", () => {
    expect(warningFromCmeSpeed(0, true).warningDays).toBe(0);
    expect(warningFromCmeSpeed(-10, true).warningDays).toBe(0);
  });
});
