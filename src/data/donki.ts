import archived from "./archived.json";
import { severityFromFlareClass } from "./severity";
import type {
  DonkiApiResponse,
  DonkiCme,
  DonkiFlare,
  SpaceWeatherResult,
} from "./donkiTypes";

export const DONKI_CACHE_KEY = "nova.donki.spaceWeather.v1";
/** Cache TTL: 6 hours (SPEC Prompt 2). */
export const DONKI_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type CacheEnvelope = {
  savedAt: number;
  result: SpaceWeatherResult;
};

type ArchivedFile = {
  source: "ARCHIVED";
  events: Array<{
    flareClassLetter: "C" | "M" | "X";
    flare: DonkiFlare;
    cme: DonkiCme | null;
  }>;
};

const archive = archived as ArchivedFile;

export type GetSpaceWeatherOptions = {
  /** Injected fetch (tests / SSR). Defaults to global fetch → /api/donki */
  fetchImpl?: typeof fetch;
  /** localStorage-like; pass null to disable cache. */
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  /** Prefer a specific archived class when falling back. Default: strongest in file (X). */
  archivePreference?: "C" | "M" | "X" | "strongest";
  now?: number;
  endpoint?: string;
};

function eventDateFrom(
  flare: DonkiFlare | null,
  cme: DonkiCme | null,
): string | null {
  const raw = flare?.peakTime ?? flare?.beginTime ?? cme?.startTime ?? null;
  if (!raw) return null;
  return raw.slice(0, 10);
}

function fromLivePayload(payload: Extract<DonkiApiResponse, { ok: true }>): SpaceWeatherResult | null {
  if ("empty" in payload && payload.empty) return null;
  if (!payload.strongestFlare) return null;

  const severity = severityFromFlareClass(payload.strongestFlare.classType);
  return {
    source: "LIVE",
    fetchedAt: payload.fetchedAt,
    window: payload.window,
    strongestFlare: payload.strongestFlare,
    fastestCme: payload.fastestCme,
    severity: severity.severity,
    classType: payload.strongestFlare.classType,
    eventDate: eventDateFrom(payload.strongestFlare, payload.fastestCme),
  };
}

function pickArchivedEvent(
  preference: "C" | "M" | "X" | "strongest",
): ArchivedFile["events"][number] {
  if (preference === "strongest") {
    return (
      archive.events.find((e) => e.flareClassLetter === "X") ??
      archive.events.find((e) => e.flareClassLetter === "M") ??
      archive.events[0]!
    );
  }
  return (
    archive.events.find((e) => e.flareClassLetter === preference) ??
    archive.events[0]!
  );
}

/** Build ARCHIVED SpaceWeatherResult from real stored DONKI records. */
export function archivedSpaceWeather(
  preference: "C" | "M" | "X" | "strongest" = "strongest",
  fetchedAt = new Date().toISOString(),
): SpaceWeatherResult {
  const entry = pickArchivedEvent(preference);
  const severity = severityFromFlareClass(entry.flare.classType);
  return {
    source: "ARCHIVED",
    fetchedAt,
    window: {
      startDate: entry.flare.beginTime.slice(0, 10),
      endDate: entry.flare.beginTime.slice(0, 10),
    },
    strongestFlare: entry.flare,
    fastestCme: entry.cme,
    severity: severity.severity,
    classType: entry.flare.classType,
    eventDate: eventDateFrom(entry.flare, entry.cme),
    message: `Using archived DONKI event ${entry.flare.flrID} (${entry.flare.classType}) from ${eventDateFrom(entry.flare, entry.cme)}.`,
  };
}

function readCache(
  storage: Pick<Storage, "getItem"> | null | undefined,
  now: number,
): SpaceWeatherResult | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(DONKI_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (!parsed?.savedAt || !parsed?.result) return null;
    if (now - parsed.savedAt > DONKI_CACHE_TTL_MS) return null;
    return parsed.result;
  } catch {
    return null;
  }
}

function writeCache(
  storage: Pick<Storage, "setItem"> | null | undefined,
  result: SpaceWeatherResult,
  now: number,
): void {
  if (!storage) return;
  try {
    const envelope: CacheEnvelope = { savedAt: now, result };
    storage.setItem(DONKI_CACHE_KEY, JSON.stringify(envelope));
  } catch {
    // Quota / private mode — ignore
  }
}

/**
 * Client entry: cache → GET /api/donki → on failure/empty use ARCHIVED with real date.
 */
export async function getSpaceWeather(
  options: GetSpaceWeatherOptions = {},
): Promise<SpaceWeatherResult> {
  const now = options.now ?? Date.now();
  const storage =
    options.storage === undefined
      ? typeof localStorage !== "undefined"
        ? localStorage
        : null
      : options.storage;
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = options.endpoint ?? "/api/donki";
  const archivePreference = options.archivePreference ?? "strongest";

  const cached = readCache(storage, now);
  if (cached) return cached;

  try {
    const res = await fetchImpl(endpoint);
    if (!res.ok) {
      const fallback = archivedSpaceWeather(
        archivePreference,
        new Date(now).toISOString(),
      );
      writeCache(storage, fallback, now);
      return fallback;
    }
    const payload = (await res.json()) as DonkiApiResponse;
    if (!payload.ok) {
      const fallback = archivedSpaceWeather(
        archivePreference,
        new Date(now).toISOString(),
      );
      writeCache(storage, fallback, now);
      return fallback;
    }
    const live = fromLivePayload(payload);
    if (!live) {
      const fallback = archivedSpaceWeather(
        archivePreference,
        new Date(now).toISOString(),
      );
      writeCache(storage, fallback, now);
      return fallback;
    }
    writeCache(storage, live, now);
    return live;
  } catch {
    const fallback = archivedSpaceWeather(
      archivePreference,
      new Date(now).toISOString(),
    );
    writeCache(storage, fallback, now);
    return fallback;
  }
}

export function clearDonkiCache(
  storage: Pick<Storage, "removeItem"> | null = typeof localStorage !==
  "undefined"
    ? localStorage
    : null,
): void {
  storage?.removeItem(DONKI_CACHE_KEY);
}

export { archived as donkiArchive };
