/**
 * Map a DONKI flare classType (e.g. "C5.3", "M1.8", "X1.6") to game severity.
 * Mapping C=1, M=2, X=3 is an ASSUMPTION (SPEC 4.1). The flare record itself is real.
 */

export type FlareSeverity = 1 | 2 | 3;

export type SeverityResult = {
  severity: FlareSeverity | null;
  classLetter: "C" | "M" | "X" | null;
  classType: string | null;
  /** Always ASSUMPTION for the numeric mapping. */
  mappingBadge: "ASSUMPTION";
};

export function flareClassLetter(
  classType: string | null | undefined,
): "C" | "M" | "X" | null {
  if (!classType) return null;
  const letter = classType.trim().charAt(0).toUpperCase();
  if (letter === "C" || letter === "M" || letter === "X") return letter;
  return null;
}

export function severityFromFlareClass(
  classType: string | null | undefined,
): SeverityResult {
  const classLetter = flareClassLetter(classType);
  const mapping: Record<"C" | "M" | "X", FlareSeverity> = {
    C: 1,
    M: 2,
    X: 3,
  };
  return {
    severity: classLetter ? mapping[classLetter] : null,
    classLetter,
    classType: classType ?? null,
    mappingBadge: "ASSUMPTION",
  };
}
