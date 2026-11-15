import { describe, expect, it } from "vitest";
import { severityFromFlareClass } from "./severity";

describe("severityFromFlareClass", () => {
  it("maps C=1, M=2, X=3 as ASSUMPTION", () => {
    expect(severityFromFlareClass("C5.3")).toMatchObject({
      severity: 1,
      classLetter: "C",
      mappingBadge: "ASSUMPTION",
    });
    expect(severityFromFlareClass("M1.8").severity).toBe(2);
    expect(severityFromFlareClass("X1.6").severity).toBe(3);
  });

  it("returns null for unknown classes", () => {
    expect(severityFromFlareClass("B1.0").severity).toBeNull();
    expect(severityFromFlareClass(null).severity).toBeNull();
  });
});
