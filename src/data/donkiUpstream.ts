import {
  isoDateDaysAgo,
  selectFastestCme,
  selectStrongestFlare,
  todayIso,
} from "./donkiSelect";
import type { DonkiApiResponse } from "./donkiTypes";

/**
 * Confirmed from CCMC DONKI-API OpenAPI (Swagger) after the 30 Sept 2026 move:
 *   docs:  https://ccmc.gsfc.nasa.gov/DONKI-API/  (OpenAPI: /DONKI-API/v3/api-docs)
 *   linked from https://ccmc.gsfc.nasa.gov/tools/DONKI and https://ccmc.gsfc.nasa.gov/tools/API/
 *   servers[0].url = "https://ccmc.gsfc.nasa.gov/DONKI-API"
 *   FLR path      = "/get/FLR?startDate&endDate"
 * No API key required.
 */
export const DONKI_API_SERVER = "https://ccmc.gsfc.nasa.gov/DONKI-API";
export const DONKI_CCMC_BASE = `${DONKI_API_SERVER}/get`;

export type FetchDonkiOptions = {
  startDate?: string;
  endDate?: string;
  fetchImpl?: typeof fetch;
};

async function fetchJsonArray(
  url: string,
  fetchImpl: typeof fetch,
): Promise<unknown[]> {
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`DONKI HTTP ${res.status} for ${url}`);
  }
  const text = await res.text();
  if (!text || text.trim() === "") return [];
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data)) {
    throw new Error(`DONKI response was not an array for ${url}`);
  }
  return data;
}

/** Server-side (or test) fetch of last-30-day FLR + CME; no API key. */
export async function fetchDonkiLive(
  options: FetchDonkiOptions = {},
): Promise<DonkiApiResponse> {
  const fetchedAt = new Date().toISOString();
  const endDate = options.endDate ?? todayIso();
  const startDate = options.startDate ?? isoDateDaysAgo(30);
  const window = { startDate, endDate };
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const flrUrl = `${DONKI_CCMC_BASE}/FLR?startDate=${startDate}&endDate=${endDate}`;
    const cmeUrl = `${DONKI_CCMC_BASE}/CME?startDate=${startDate}&endDate=${endDate}`;
    const [flaresRaw, cmesRaw] = await Promise.all([
      fetchJsonArray(flrUrl, fetchImpl),
      fetchJsonArray(cmeUrl, fetchImpl),
    ]);

    const strongestFlare = selectStrongestFlare(
      flaresRaw as Parameters<typeof selectStrongestFlare>[0],
    );
    const fastestCme = selectFastestCme(
      cmesRaw as Parameters<typeof selectFastestCme>[0],
    );

    if (!strongestFlare) {
      return {
        ok: true,
        source: "LIVE",
        empty: true,
        fetchedAt,
        window,
        strongestFlare: null,
        fastestCme: null,
        flaresConsidered: flaresRaw.length,
        cmesConsidered: cmesRaw.length,
        message:
          flaresRaw.length === 0 && cmesRaw.length === 0
            ? "No flares or CMEs in the last 30 days."
            : "No class C/M/X flares in the last 30 days.",
      };
    }

    return {
      ok: true,
      source: "LIVE",
      fetchedAt,
      window,
      strongestFlare,
      fastestCme,
      flaresConsidered: flaresRaw.length,
      cmesConsidered: cmesRaw.length,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      fetchedAt,
    };
  }
}
