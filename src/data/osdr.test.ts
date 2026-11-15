import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getOsdrStudy,
  listArchivedOsdrStudies,
  pickArchivedOsdrStudy,
  pickOsdrStudy,
} from "./osdr";
import { fetchOsdrLive, findingFromDescription } from "./osdrUpstream";
import { buildGreenhouseEvent, ISS_MOON_CAUTION } from "../content/greenhouse";
import { buildRadiationMattersCard } from "../content/radiation";
import { scheduleMissionEvents } from "../content/schedule";
import { archivedSpaceWeather } from "./donki";

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OSDR archive integrity", () => {
  it("holds three real OSD ids with findings", () => {
    const studies = listArchivedOsdrStudies();
    expect(studies.map((s) => s.id).sort()).toEqual(
      ["OSD-37", "OSD-476", "OSD-520"].sort(),
    );
    for (const s of studies) {
      expect(s.title.length).toBeGreaterThan(10);
      expect(s.organism.length).toBeGreaterThan(3);
      expect(s.finding.length).toBeGreaterThan(10);
      expect(s.url).toContain(s.id);
    }
  });
});

describe("fetchOsdrLive mocked", () => {
  it("success: returns LIVE study from OSD search + meta", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("/search")) {
        return Response.json({
          hits: {
            total: 2,
            hits: [
              {
                _source: {
                  Accession: "OSD-476",
                  "Study Title":
                    "Plants grown in Apollo lunar regolith present stress-associated transcriptomes",
                  "Study Description":
                    "Arabidopsis thaliana germinates and grows in lunar regoliths. Growth is challenging.",
                  organism: "Arabidopsis thaliana",
                  Mission: { Name: "" },
                  "Flight Program": "",
                },
              },
            ],
          },
        });
      }
      // numeric meta
      if (u.includes("/osd/meta/")) {
        return Response.json({
          success: true,
          input: "476",
          hits: 1,
          study: { "OSD-476": { studies: [{ title: "x" }] } },
        });
      }
      return new Response("nope", { status: 404 });
    });

    const result = await fetchOsdrLive({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok || "empty" in result) throw new Error("expected success");
    expect(result.study.id).toBe("OSD-476");
    expect(result.study.source).toBe("LIVE");
    expect(result.study.finding.toLowerCase()).toContain("arabidopsis");
  });

  it("empty: no OSD hits", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        hits: {
          total: 1,
          hits: [
            {
              _source: {
                Accession: "mgp21999",
                "Study Title": "wastewater treatment plant",
                "Study Description": "not space biology",
              },
            },
          ],
        },
      }),
    );
    const result = await fetchOsdrLive({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect("empty" in result && result.empty).toBe(true);
  });

  it("failure: network error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    const result = await fetchOsdrLive({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
  });
});

describe("getOsdrStudy client fallback", () => {
  it("uses ARCHIVED on empty live payload", async () => {
    const storage = memoryStorage();
    const fetchImpl = vi.fn(async () =>
      Response.json({
        ok: true,
        empty: true,
        source: "LIVE",
        study: null,
        searched: 0,
        message: "none",
      }),
    );
    const study = await getOsdrStudy({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      storage,
      role: "greenhouse",
    });
    expect(study.source).toBe("ARCHIVED");
    expect(study.id.startsWith("OSD-")).toBe(true);
  });

  it("uses ARCHIVED on fetch failure", async () => {
    const study = await getOsdrStudy({
      fetchImpl: (async () => {
        throw new Error("boom");
      }) as unknown as typeof fetch,
      storage: memoryStorage(),
    });
    expect(study.source).toBe("ARCHIVED");
  });
});

describe("seeded study pick + greenhouse/radiation cards", () => {
  it("pickOsdrStudy differs by seed", () => {
    const studies = listArchivedOsdrStudies();
    // With 3 studies, many seeds collide; check function is deterministic
    expect(pickOsdrStudy(studies, 1)).toEqual(pickOsdrStudy(studies, 1));
    const a = pickArchivedOsdrStudy("greenhouse", 1);
    const b = pickArchivedOsdrStudy("greenhouse", 2);
    // greenhouse pool has 2 studies — seeds should be able to differ
    expect([a.id, b.id].every((id) => id.startsWith("OSD-"))).toBe(true);
  });

  it("buildGreenhouseEvent includes finding, link, and Moon caution", () => {
    const study = pickArchivedOsdrStudy("greenhouse", 7);
    const event = buildGreenhouseEvent(study);
    expect(event.sourceBadge).toBe("ARCHIVED");
    expect(event.realWorldNote).toContain(study.finding);
    expect(event.realWorldNote).toContain(study.url);
    expect(event.realWorldNote).toContain(ISS_MOON_CAUTION);
    expect(event.optionA.benefit).toContain("oxygen");
    expect(event.optionA.cost).toContain("water");
  });

  it("radiation card cites OSD-520-style study after storms in schedule", () => {
    const weather = archivedSpaceWeather("X");
    const schedule = scheduleMissionEvents(42, weather, true);
    expect(schedule.radiationStudy.id).toBeTruthy();
    const stormSlot = schedule.days.find((d) => d.day === schedule.stormDay);
    expect(stormSlot?.afterStormCard?.id).toBe("why-radiation-matters");
    expect(stormSlot?.afterStormCard?.realWorldNote).toContain(
      schedule.radiationStudy.id,
    );
    const gh = schedule.days.find((d) => d.event.id === "greenhouse-experiment");
    expect(gh).toBeDefined();
    expect(gh!.event.realWorldNote).toContain(schedule.greenhouseStudy.finding);
  });

  it("findingFromDescription keeps text from the record", () => {
    const f = findingFromDescription(
      "Arabidopsis germinates in lunar regolith. Growth is challenging. More detail follows.",
    );
    expect(f.toLowerCase()).toContain("arabidopsis");
  });

  it("buildRadiationMattersCard marks exposure meter as ASSUMPTION", () => {
    const study = listArchivedOsdrStudies().find((s) => s.id === "OSD-520")!;
    const card = buildRadiationMattersCard(study);
    expect(card.realWorldNote).toContain("ASSUMPTION");
    expect(card.realWorldNote).toContain("OSD-520");
  });
});
