/** Soft-pixel art — Gemini-cut rooms + sprites under /art/soft-pixel/. */

const C = "/art/cutouts";
const S = "/art/soft-pixel";
const B = `${S}/backgrounds`;
const P = `${S}/sprites`;
/** Bust browser cache after rembg re-export of white suits. */
const V = "?v=white-suit";

export const ART = {
  nova: `${C}/nova-astronaut-boy.png${V}`,
  novaGirlHelmet: `${C}/astronaut-girl-with-helmet.png${V}`,
  novaGirlGlasses: `${C}/astronaut-girl-with-glasses.png${V}`,
  /** Soft-pixel rooms (cut from Gemini sheets). */
  lab: `${B}/lab.jpg`,
  bunks: `${B}/home.jpg`,
  greenhouseIn: `${B}/greenhouse-plants.jpg`,
  greenhouseDome: `${C}/greenhouse-dome.png`,
  habitatDome: `${C}/habitat-dome.png`,
  cottage: `${C}/stone-cottage-base.png`,
  earthMoon: `${C}/earth-from-moon.png`,
  lunarSurface: `${B}/surface-hub.jpg`,
  /** Soft-pixel Gemini hub — full-bleed surface stage. */
  moonBaseHub: `${B}/surface-hub.jpg`,
  rover: `${P}/rover.png`,
  panels: `${C}/solar-panels.png`,
  dish: `${P}/dish-icon.png`,
  waterTower: `${C}/water-tower.png`,
  crates: `${P}/crate.png`,
  waterCleaner: `${C}/water-cleaner.svg`,
  airMaker: `${C}/air-maker.svg`,
  growLight: `${C}/grow-light-bar.svg`,
  sampleAnalyzer: `${C}/sample-analyzer.svg`,
  plant0: `${P}/plant-stage-0.png`,
  plant1: `${P}/plant-stage-1.png`,
  plant2: `${P}/plant-stage-2.png`,
  plant3: `${P}/plant-stage-3.png`,
  plantTray: `${P}/plant-tray.png`,
  bunkMarker: `${C}/bunk-marker.svg`,
  radioConsole: `${P}/dish-small.png`,
  waterTap: `${C}/water-tap-can.svg`,
  chip: `${P}/chip.png`,
  waterDrop: `${P}/water-drop.png`,
  seedSack: `${P}/seed-sack.png`,
  bucketFull: `${P}/bucket-full.png`,
  terminal: `${P}/terminal.png`,
  beakers: `${P}/beakers.png`,
  sampleCrate: `${P}/sample-crate.png`,

  iconBattery: "/art/battery.png",
  iconWater: `${P}/water-drop.png`,
  iconLeaf: "/art/leaf.png",
  iconHeart: "/art/heart.png",
  iconZap: "/art/zap.png",
  iconShield: "/art/shield-check.png",
  iconSun: "/art/sun.png",
  iconSunMed: "/art/sun-medium.png",
  iconSunDim: "/art/sun-dim.png",
  iconWind: "/art/wind.png",
  iconCalendar: "/art/calendar-days.png",
} as const;

export type ArtKey = keyof typeof ART;
