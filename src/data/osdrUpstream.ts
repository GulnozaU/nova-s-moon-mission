/**
 * Server-side OSDR fetch (no API key).
 *
 * Confirmed 2026-11-15 against live NASA endpoints:
 * - Search WORKS: https://osdr.nasa.gov/osdr/data/search?term=plant  (JSON)
 * - Meta WORKS with numeric id only:
 *     https://osdr.nasa.gov/osdr/data/osd/meta/476
 *   Prefix form https://osdr.nasa.gov/osdr/data/osd/meta/OSD-476 returns empty study {}.
 * - Study pages: https://osdr.nasa.gov/bio/repo/data/studies/OSD-{id}
 * - Also available: Biological Data API
 *     https://visualization.osdr.nasa.gov/biodata/api/v2/dataset/OSD-{id}/
 *   Docs: https://visualization.osdr.nasa.gov/biodata/api/
 */

import type { OsdrApiResponse, OsdrStudy } from "./osdrTypes";

export const OSDR_SEARCH_URL =
  "https://osdr.nasa.gov/osdr/data/search?term=plant";
export const OSDR_META_BASE = "https://osdr.nasa.gov/osdr/data/osd/meta";
export const OSDR_STUDY_PAGE = (id: string) =>
  `https://osdr.nasa.gov/bio/repo/data/studies/${id}`;

export type FetchOsdrOptions = {
  fetchImpl?: typeof fetch;
  /** Override search URL (tests). */
  searchUrl?: string;
  /** Prefer a specific OSD id from search hits when present. */
  preferId?: string;
};

type SearchHit = {
  _source?: {
    Accession?: string;
    "Study Title"?: string;
    "Study Description"?: string;
    organism?: string | string[];
    Mission?: { Name?: string; "Start Date"?: string; "End Date"?: string };
    "Flight Program"?: string;
    "Study Publication Title"?: string;
  };
};

function numericId(osdId: string): string {
  return osdId.replace(/^OSD-/i, "");
}

function normalizeOrganism(org: string | string[] | undefined): string {
  if (!org) return "";
  if (Array.isArray(org)) return org.filter(Boolean).join(", ");
  return org;
}

/** First sentence(s) of the OSDR description, kept short for kids — not invented. */
export function findingFromDescription(description: string): string {
  const clean = description.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const parts = clean.split(/(?<=\.)\s+/);
  const first = parts[0] ?? clean;
  const second = parts[1];
  const combined =
    second && first.length < 120 ? `${first} ${second}` : first;
  return combined.length > 220 ? `${combined.slice(0, 217)}…` : combined;
}

function studyFromSearchHit(source: NonNullable<SearchHit["_source"]>): OsdrStudy | null {
  const id = source.Accession;
  if (!id || !id.startsWith("OSD-")) return null;
  const mission =
    source.Mission?.Name ||
    source["Flight Program"] ||
    "Not listed on record";
  const finding = findingFromDescription(source["Study Description"] ?? "");
  if (!source["Study Title"] || !finding) return null;
  return {
    id,
    title: source["Study Title"],
    organism: normalizeOrganism(source.organism) || "Not listed on record",
    mission,
    finding,
    url: OSDR_STUDY_PAGE(id),
    source: "LIVE",
    role: "general",
  };
}

async function fetchJson(
  url: string,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`OSDR HTTP ${res.status} for ${url}`);
  return res.json();
}

/**
 * Confirm meta endpoint: MUST use numeric id (476), not "OSD-476".
 * Returns true if study payload is non-empty.
 */
export async function fetchOsdrMetaRaw(
  osdId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; input: string; hasStudy: boolean }> {
  const num = numericId(osdId);
  const data = (await fetchJson(
    `${OSDR_META_BASE}/${num}`,
    fetchImpl,
  )) as {
    success?: boolean;
    input?: string;
    study?: Record<string, unknown>;
  };
  const study = data.study ?? {};
  return {
    ok: Boolean(data.success),
    input: String(data.input ?? num),
    hasStudy: Object.keys(study).length > 0,
  };
}

/** Live plant search → pick an OSD-* hit → verify meta → return study card. */
export async function fetchOsdrLive(
  options: FetchOsdrOptions = {},
): Promise<OsdrApiResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const searchUrl = options.searchUrl ?? OSDR_SEARCH_URL;

  try {
    const raw = (await fetchJson(searchUrl, fetchImpl)) as {
      hits?: { hits?: SearchHit[]; total?: number | { value?: number } };
    };
    const hits = raw.hits?.hits ?? [];
    const total =
      typeof raw.hits?.total === "number"
        ? raw.hits.total
        : raw.hits?.total?.value ?? hits.length;

    const osdHits = hits
      .map((h) => h._source)
      .filter((s): s is NonNullable<SearchHit["_source"]> => Boolean(s))
      .filter((s) => (s.Accession ?? "").startsWith("OSD-"));

    if (osdHits.length === 0) {
      return {
        ok: true,
        empty: true,
        source: "LIVE",
        study: null,
        searched: total,
        message: "No OSD-* plant studies in search hits.",
      };
    }

    let chosen = osdHits[0]!;
    if (options.preferId) {
      chosen =
        osdHits.find((s) => s.Accession === options.preferId) ?? chosen;
    }

    const study = studyFromSearchHit(chosen);
    if (!study) {
      return {
        ok: true,
        empty: true,
        source: "LIVE",
        study: null,
        searched: total,
        message: "Search hit missing title or description.",
      };
    }

    // Verify meta endpoint (numeric) — SPEC requires reading meta/{id}.
    const meta = await fetchOsdrMetaRaw(study.id, fetchImpl);
    if (!meta.hasStudy) {
      // Search had the study but meta failed — still treat as live from search,
      // but note meta emptiness (known issue for OSD- prefix paths).
      return {
        ok: true,
        empty: true,
        source: "LIVE",
        study: null,
        searched: total,
        message: `Meta empty for ${study.id} (tried numeric ${numericId(study.id)}).`,
      };
    }

    return {
      ok: true,
      source: "LIVE",
      study,
      searched: total,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
