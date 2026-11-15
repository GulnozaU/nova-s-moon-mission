import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DONKI_CACHE_KEY,
  archivedSpaceWeather,
  clearDonkiCache,
  getSpaceWeather,
} from "./donki";
import { selectFastestCme, selectStrongestFlare } from "./donkiSelect";
import { fetchDonkiLive } from "./donkiUpstream";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
    key: (i) => [...map.keys()][i] ?? null,
  };
}

const sampleFlare = {
  flrID: "2024-05-03T02:11:00-FLR-001",
  classType: "X1.6",
  beginTime: "2024-05-03T02:11Z",
  peakTime: "2024-05-03T02:22Z",
  link: "https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30403/-1",
};

const sampleCme = {
  activityID: "2024-05-03T02:48:00-CME-001",
  startTime: "2024-05-03T02:48Z",
  link: "https://ccmc.gsfc.nasa.gov/DONKI/view/CME/30409/-1",
  cmeAnalyses: [
    {
      isMostAccurate: true,
      speed: 841,
      type: "C",
      link: "https://ccmc.gsfc.nasa.gov/DONKI/view/CMEAnalysis/30410/-1",
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("donki selectors", () => {
  it("picks the strongest flare and fastest CME", () => {
    const strongest = selectStrongestFlare([
      {
        flrID: "c",
        classType: "C5.3",
        beginTime: "2024-05-01T05:53Z",
        link: "https://example.test/c",
      },
      {
        flrID: "x",
        classType: "X1.6",
        beginTime: "2024-05-03T02:11Z",
        link: "https://example.test/x",
      },
      {
        flrID: "m",
        classType: "M1.8",
        beginTime: "2024-05-01T22:26Z",
        link: "https://example.test/m",
      },
    ]);
    expect(strongest?.flrID).toBe("x");

    const fastest = selectFastestCme([
      {
        activityID: "slow",
        startTime: "2024-05-01T00:00Z",
        link: "https://example.test/slow",
        cmeAnalyses: [{ isMostAccurate: true, speed: 353 }],
      },
      {
        activityID: "fast",
        startTime: "2024-05-03T02:48Z",
        link: "https://example.test/fast",
        cmeAnalyses: [{ isMostAccurate: true, speed: 841 }],
      },
    ]);
    expect(fastest?.activityID).toBe("fast");
    expect(fastest?.mostAccurateSpeedKmS).toBe(841);
  });
});

describe("getSpaceWeather with mocked fetch", () => {
  it("success: returns LIVE strongest flare and fastest CME with real ids/dates", async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async () =>
      Response.json({
        ok: true,
        source: "LIVE",
        fetchedAt: "2026-11-15T12:00:00.000Z",
        window: { startDate: "2026-10-16", endDate: "2026-11-15" },
        strongestFlare: sampleFlare,
        fastestCme: {
          activityID: sampleCme.activityID,
          startTime: sampleCme.startTime,
          link: sampleCme.link,
          mostAccurateSpeedKmS: 841,
          mostAccurateType: "C",
          analysisLink: sampleCme.cmeAnalyses[0]!.link,
        },
        flaresConsidered: 10,
        cmesConsidered: 5,
      }),
    );

    const result = await getSpaceWeather({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage,
      now: 1_000_000,
    });

    expect(result.source).toBe("LIVE");
    expect(result.strongestFlare?.flrID).toBe(sampleFlare.flrID);
    expect(result.fastestCme?.activityID).toBe(sampleCme.activityID);
    expect(result.eventDate).toBe("2024-05-03");
    expect(result.severity).toBe(3);
    expect(storage.getItem(DONKI_CACHE_KEY)).toBeTruthy();
  });

  it("empty live result: falls back to ARCHIVED with real date", async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async () =>
      Response.json({
        ok: true,
        source: "LIVE",
        empty: true,
        fetchedAt: "2026-11-15T12:00:00.000Z",
        window: { startDate: "2026-10-16", endDate: "2026-11-15" },
        strongestFlare: null,
        fastestCme: null,
        flaresConsidered: 0,
        cmesConsidered: 0,
        message: "No flares or CMEs in the last 30 days.",
      }),
    );

    const result = await getSpaceWeather({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage,
      now: 2_000_000,
    });

    expect(result.source).toBe("ARCHIVED");
    expect(result.strongestFlare?.flrID).toMatch(/-FLR-/);
    expect(result.eventDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.message).toContain("archived DONKI event");
  });

  it("failure: falls back to ARCHIVED with real date", async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });

    const result = await getSpaceWeather({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage,
      now: 3_000_000,
    });

    expect(result.source).toBe("ARCHIVED");
    expect(result.strongestFlare?.flrID).toBe("2024-05-03T02:11:00-FLR-001");
    expect(result.eventDate).toBe("2024-05-03");
  });

  it("HTTP error from /api/donki uses ARCHIVED", async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, error: "upstream" }), {
        status: 502,
      }),
    );

    const result = await getSpaceWeather({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage,
    });
    expect(result.source).toBe("ARCHIVED");
  });

  it("serves cache within 6 hours without refetching", async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async () =>
      Response.json({
        ok: true,
        source: "LIVE",
        fetchedAt: "2026-11-15T12:00:00.000Z",
        window: { startDate: "2026-10-16", endDate: "2026-11-15" },
        strongestFlare: sampleFlare,
        fastestCme: null,
        flaresConsidered: 1,
        cmesConsidered: 0,
      }),
    );

    const first = await getSpaceWeather({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage,
      now: 10_000,
    });
    const second = await getSpaceWeather({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage,
      now: 10_000 + 5 * 60 * 60 * 1000,
    });

    expect(first.source).toBe("LIVE");
    expect(second).toEqual(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("fetchDonkiLive mocked upstream", () => {
  it("success path selects strongest flare and fastest CME", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("/FLR")) {
        return Response.json([
          sampleFlare,
          {
            flrID: "2024-05-01T05:53:00-FLR-001",
            classType: "C5.3",
            beginTime: "2024-05-01T05:53Z",
            link: "https://example.test/c",
          },
        ]);
      }
      return Response.json([sampleCme]);
    });

    const result = await fetchDonkiLive({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      startDate: "2024-05-01",
      endDate: "2024-05-14",
    });

    expect(result.ok).toBe(true);
    if (!result.ok || "empty" in result) throw new Error("expected success");
    expect(result.strongestFlare.flrID).toBe(sampleFlare.flrID);
    expect(result.fastestCme?.activityID).toBe(sampleCme.activityID);
    expect(result.fastestCme?.mostAccurateSpeedKmS).toBe(841);
  });

  it("empty arrays yield empty LIVE payload", async () => {
    const fetchImpl = vi.fn(async () => Response.json([]));
    const result = await fetchDonkiLive({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect("empty" in result && result.empty).toBe(true);
  });

  it("HTTP failure yields ok:false", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    const result = await fetchDonkiLive({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
  });
});

describe("archived.json integrity", () => {
  it("contains real C, M, X IDs and dates (not invented placeholders)", () => {
    const archived = archivedSpaceWeather("C");
    expect(archived.strongestFlare?.flrID).toBe(
      "2024-05-01T05:53:00-FLR-001",
    );
    expect(archived.strongestFlare?.classType).toBe("C5.3");
    expect(archived.fastestCme?.activityID).toBe(
      "2024-05-01T06:36:00-CME-001",
    );

    const m = archivedSpaceWeather("M");
    expect(m.strongestFlare?.flrID).toBe("2024-05-01T22:26:00-FLR-001");

    const x = archivedSpaceWeather("X");
    expect(x.strongestFlare?.flrID).toBe("2024-05-03T02:11:00-FLR-001");
    expect(x.eventDate).toBe("2024-05-03");
  });

  it("clearDonkiCache removes the key", () => {
    const storage = memoryStorage();
    storage.setItem(DONKI_CACHE_KEY, "{}");
    clearDonkiCache(storage);
    expect(storage.getItem(DONKI_CACHE_KEY)).toBeNull();
  });
});
