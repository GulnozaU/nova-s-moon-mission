import { describe, expect, it } from "vitest";
import { buildGreenhouseEvent } from "./greenhouse";
import {
  getNasaImage,
  listNasaImages,
  nasaImageReferenceLines,
} from "./images";
import { buildStormEvent } from "./storm";
import { STATIC_EVENTS } from "./events";
import { archivedSpaceWeather } from "../data/donki";
import { pickArchivedOsdrStudy } from "../data/osdr";

describe("NASA images (Section 4.5)", () => {
  it("bundles six real IDs with credit, page URL, alt, and file", () => {
    const images = listNasaImages();
    expect(images.map((i) => i.slot).sort()).toEqual(
      [
        "dust",
        "equatorial",
        "greenhouse",
        "southPole",
        "storm",
        "title",
      ].sort(),
    );
    for (const img of images) {
      expect(img.id.length).toBeGreaterThan(3);
      expect(img.credit.startsWith("Image:")).toBe(true);
      expect(img.pageUrl).toContain(img.id);
      expect(img.alt.length).toBeGreaterThan(10);
      expect(img.file.startsWith("/images/")).toBe(true);
      expect(img.credit.toLowerCase()).not.toContain("logo");
      expect(img.credit.toLowerCase()).not.toContain("insignia");
    }
  });

  it("attaches picture + credit to storm, dust, and greenhouse cards", () => {
    const storm = buildStormEvent(archivedSpaceWeather("X"), true).event;
    expect(storm.image?.nasaId).toBe(getNasaImage("storm").id);
    expect(storm.image?.credit).toBe(getNasaImage("storm").credit);

    const dust = STATIC_EVENTS.find((e) => e.id === "lunar-dust")!;
    expect(dust.image?.nasaId).toBe(getNasaImage("dust").id);

    const gh = buildGreenhouseEvent(pickArchivedOsdrStudy("greenhouse", 1));
    expect(gh.image?.nasaId).toBe(getNasaImage("greenhouse").id);
  });

  it("lists every image with credit for References", () => {
    const lines = nasaImageReferenceLines();
    expect(lines).toHaveLength(6);
    expect(lines.join("\n")).toContain("PIA13227");
    expect(lines.join("\n")).toContain("Image:");
  });
});
