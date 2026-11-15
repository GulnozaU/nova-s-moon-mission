import type { SourceBadge } from "../types";
import type { FlareSeverity } from "./severity";

export type DonkiFlare = {
  flrID: string;
  classType: string;
  beginTime: string;
  peakTime: string | null;
  endTime?: string | null;
  sourceLocation?: string | null;
  activeRegionNum?: number | null;
  linkedEvents?: Array<{ activityID: string }> | null;
  link: string;
};

export type DonkiCme = {
  activityID: string;
  startTime: string;
  sourceLocation?: string | null;
  link: string;
  mostAccurateSpeedKmS: number | null;
  mostAccurateType?: string | null;
  analysisLink?: string | null;
  time21_5?: string | null;
};

/** Live or archived space-weather payload used by the game. */
export type SpaceWeatherResult = {
  source: Extract<SourceBadge, "LIVE" | "ARCHIVED">;
  fetchedAt: string;
  window: { startDate: string; endDate: string };
  strongestFlare: DonkiFlare | null;
  fastestCme: DonkiCme | null;
  severity: FlareSeverity | null;
  classType: string | null;
  /** Real date string from the flare peak/begin or CME start. */
  eventDate: string | null;
  message?: string;
};

export type DonkiApiSuccess = {
  ok: true;
  source: "LIVE";
  fetchedAt: string;
  window: { startDate: string; endDate: string };
  strongestFlare: DonkiFlare;
  fastestCme: DonkiCme | null;
  flaresConsidered: number;
  cmesConsidered: number;
};

export type DonkiApiEmpty = {
  ok: true;
  source: "LIVE";
  empty: true;
  fetchedAt: string;
  window: { startDate: string; endDate: string };
  strongestFlare: null;
  fastestCme: null;
  flaresConsidered: number;
  cmesConsidered: number;
  message: string;
};

export type DonkiApiError = {
  ok: false;
  error: string;
  fetchedAt: string;
};

export type DonkiApiResponse = DonkiApiSuccess | DonkiApiEmpty | DonkiApiError;
