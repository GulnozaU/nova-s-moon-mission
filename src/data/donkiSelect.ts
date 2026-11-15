import type { DonkiCme, DonkiFlare } from "./donkiTypes";
import { flareClassLetter } from "./severity";

type RawFlare = {
  flrID?: string;
  classType?: string;
  beginTime?: string;
  peakTime?: string | null;
  endTime?: string | null;
  sourceLocation?: string | null;
  activeRegionNum?: number | null;
  linkedEvents?: Array<{ activityID: string }> | null;
  link?: string;
};

type RawCmeAnalysis = {
  isMostAccurate?: boolean;
  speed?: number | null;
  type?: string | null;
  link?: string | null;
  time21_5?: string | null;
};

type RawCme = {
  activityID?: string;
  startTime?: string;
  sourceLocation?: string | null;
  link?: string;
  cmeAnalyses?: RawCmeAnalysis[] | null;
};

const CLASS_RANK: Record<"C" | "M" | "X", number> = { C: 1, M: 2, X: 3 };

function classMagnitude(classType: string): number {
  const match = classType.trim().match(/^[CMX]\s*([0-9]+(?:\.[0-9]+)?)/i);
  return match ? Number(match[1]) : 0;
}

/** Strongest flare: X > M > C, then higher magnitude within the class. */
export function selectStrongestFlare(rawFlares: RawFlare[]): DonkiFlare | null {
  const usable = rawFlares
    .filter((f) => f.flrID && f.classType && f.beginTime && f.link)
    .filter((f) => flareClassLetter(f.classType) !== null);

  if (usable.length === 0) return null;

  usable.sort((a, b) => {
    const la = flareClassLetter(a.classType!)!;
    const lb = flareClassLetter(b.classType!)!;
    if (CLASS_RANK[la] !== CLASS_RANK[lb]) {
      return CLASS_RANK[lb] - CLASS_RANK[la];
    }
    return classMagnitude(b.classType!) - classMagnitude(a.classType!);
  });

  const top = usable[0]!;
  return {
    flrID: top.flrID!,
    classType: top.classType!,
    beginTime: top.beginTime!,
    peakTime: top.peakTime ?? null,
    endTime: top.endTime ?? null,
    sourceLocation: top.sourceLocation ?? null,
    activeRegionNum: top.activeRegionNum ?? null,
    linkedEvents: top.linkedEvents ?? null,
    link: top.link!,
  };
}

function mostAccurateSpeed(cme: RawCme): {
  speed: number | null;
  analysis: RawCmeAnalysis | null;
} {
  const analyses = cme.cmeAnalyses ?? [];
  const accurate =
    analyses.find((a) => a.isMostAccurate) ?? analyses[0] ?? null;
  const speed =
    accurate && typeof accurate.speed === "number" && accurate.speed > 0
      ? accurate.speed
      : null;
  return { speed, analysis: accurate };
}

/** Fastest CME by most-accurate analysis speed (km/s). */
export function selectFastestCme(rawCmes: RawCme[]): DonkiCme | null {
  let best: DonkiCme | null = null;
  let bestSpeed = -1;

  for (const cme of rawCmes) {
    if (!cme.activityID || !cme.startTime || !cme.link) continue;
    const { speed, analysis } = mostAccurateSpeed(cme);
    if (speed === null) continue;
    if (speed > bestSpeed) {
      bestSpeed = speed;
      best = {
        activityID: cme.activityID,
        startTime: cme.startTime,
        sourceLocation: cme.sourceLocation ?? null,
        link: cme.link,
        mostAccurateSpeedKmS: speed,
        mostAccurateType: analysis?.type ?? null,
        analysisLink: analysis?.link ?? null,
        time21_5: analysis?.time21_5 ?? null,
      };
    }
  }

  return best;
}

export function isoDateDaysAgo(daysAgo: number, now = new Date()): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
