import { ART } from "../ui/art";
import { listNasaImages } from "../content/images";

/** Map logical keys → public URLs for Phaser load.image */
export const PHASER_ART = {
  nova: ART.nova,
  girl: ART.novaGirlHelmet,
  worker: ART.novaGirlGlasses,
  surface: ART.lunarSurface,
  hubPixel: ART.moonBaseHub,
  habitat: ART.habitatDome,
  greenhouse: ART.greenhouseDome,
  labCottage: ART.cottage,
  panels: ART.panels,
  dish: ART.dish,
  rover: ART.rover,
  earth: ART.earthMoon,
  bunks: ART.bunks,
  greenhouseIn: ART.greenhouseIn,
  labIn: ART.lab,
  water: ART.iconWater,
  leaf: ART.iconLeaf,
  zap: ART.iconZap,
  chip: ART.chip,
  crates: ART.crates,
  waterCleaner: ART.waterCleaner,
  airMaker: ART.airMaker,
  growLight: ART.growLight,
  sampleAnalyzer: ART.sampleAnalyzer,
  plant0: ART.plant0,
  plant1: ART.plant1,
  plant2: ART.plant2,
  plant3: ART.plant3,
  plantTray: ART.plantTray,
  bunkMarker: ART.bunkMarker,
  radioConsole: ART.radioConsole,
  waterTap: ART.waterTap,
  terminal: ART.terminal,
  beakers: ART.beakers,
  sampleCrate: ART.sampleCrate,
  seedSack: ART.seedSack,
  bucketFull: ART.bucketFull,
  waterDrop: ART.waterDrop,
} as const;

/** NASA stills keyed nasa_<slot> so the in-game frame can rotate. */
export function nasaPhaserKeys(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const img of listNasaImages()) {
    out[`nasa_${img.slot}`] = img.file;
  }
  return out;
}

export type PhaserArtKey = keyof typeof PHASER_ART;
