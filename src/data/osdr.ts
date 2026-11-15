import archiveFile from "./osdr-archive.json";
import type { OsdrApiResponse, OsdrStudy } from "./osdrTypes";
import { createRng } from "../engine/rng";

export const OSDR_CACHE_KEY = "nova.osdr.study.v1";
export const OSDR_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type ArchiveFile = {
  studies: Array<
    OsdrStudy & {
      description?: string;
      flightProgram?: string;
      role?: "greenhouse" | "radiation" | "general";
    }
  >;
};

const archive = archiveFile as ArchiveFile;

export type GetOsdrOptions = {
  fetchImpl?: typeof fetch;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  endpoint?: string;
  now?: number;
  /** Prefer greenhouse or radiation archive roles on fallback. */
  role?: "greenhouse" | "radiation" | "general";
};

function archivedStudies(): OsdrStudy[] {
  return archive.studies.map((s) => ({
    id: s.id,
    title: s.title,
    organism: s.organism,
    mission: s.mission,
    finding: s.finding,
    url: s.url,
    source: "ARCHIVED" as const,
    role: s.role,
  }));
}

export function listArchivedOsdrStudies(): OsdrStudy[] {
  return archivedStudies();
}

export function pickArchivedOsdrStudy(
  role: "greenhouse" | "radiation" | "general" = "greenhouse",
  seed = 0,
): OsdrStudy {
  const all = archivedStudies();
  const pool =
    role === "general"
      ? all
      : all.filter((s) => s.role === role || (!s.role && role === "greenhouse"));
  const list = pool.length > 0 ? pool : all;
  const rng = createRng(seed);
  const idx = Math.floor(rng() * list.length) % list.length;
  return list[idx]!;
}

/** Seeded pick among provided studies (live list or archive). */
export function pickOsdrStudy(studies: OsdrStudy[], seed: number): OsdrStudy {
  if (studies.length === 0) {
    return pickArchivedOsdrStudy("greenhouse", seed);
  }
  const rng = createRng(seed);
  const idx = Math.floor(rng() * studies.length) % studies.length;
  return studies[idx]!;
}

function readCache(
  storage: Pick<Storage, "getItem"> | null | undefined,
  now: number,
): OsdrStudy | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(OSDR_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; study: OsdrStudy };
    if (!parsed?.savedAt || !parsed.study) return null;
    if (now - parsed.savedAt > OSDR_CACHE_TTL_MS) return null;
    return parsed.study;
  } catch {
    return null;
  }
}

function writeCache(
  storage: Pick<Storage, "setItem"> | null | undefined,
  study: OsdrStudy,
  now: number,
): void {
  if (!storage) return;
  try {
    storage.setItem(
      OSDR_CACHE_KEY,
      JSON.stringify({ savedAt: now, study }),
    );
  } catch {
    // ignore
  }
}

/**
 * Client: cache → GET /api/osdr → ARCHIVED fallback with badge.
 */
export async function getOsdrStudy(
  options: GetOsdrOptions = {},
): Promise<OsdrStudy> {
  const now = options.now ?? Date.now();
  const storage =
    options.storage === undefined
      ? typeof localStorage !== "undefined"
        ? localStorage
        : null
      : options.storage;
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = options.endpoint ?? "/api/osdr";
  const role = options.role ?? "greenhouse";

  const cached = readCache(storage, now);
  if (cached) return cached;

  try {
    const res = await fetchImpl(endpoint);
    if (!res.ok) {
      const fallback = pickArchivedOsdrStudy(role, now);
      writeCache(storage, fallback, now);
      return fallback;
    }
    const payload = (await res.json()) as OsdrApiResponse;
    if (!payload.ok || ("empty" in payload && payload.empty) || !("study" in payload) || !payload.study) {
      const fallback = pickArchivedOsdrStudy(role, now);
      writeCache(storage, fallback, now);
      return fallback;
    }
    writeCache(storage, payload.study, now);
    return payload.study;
  } catch {
    const fallback = pickArchivedOsdrStudy(role, now);
    writeCache(storage, fallback, now);
    return fallback;
  }
}
