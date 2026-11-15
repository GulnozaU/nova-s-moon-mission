/** Storybook art. Cutouts = backdrop removed (transparent PNG, white suits kept). */

const C = "/art/cutouts";
/** Bust browser cache after rembg re-export of white suits. */
const V = "?v=white-suit";

export const ART = {
  nova: `${C}/nova-astronaut-boy.png${V}`,
  novaGirlHelmet: `${C}/astronaut-girl-with-helmet.png${V}`,
  novaGirlGlasses: `${C}/astronaut-girl-with-glasses.png${V}`,
  lab: "/art/science-lab-nova-notebook.jpeg",
  bunks: "/art/crew-quarters-bunks.jpeg",
  greenhouseIn: "/art/greenhouse-interior.jpeg",
  greenhouseDome: `${C}/greenhouse-dome.png`,
  habitatDome: `${C}/habitat-dome.png`,
  cottage: `${C}/stone-cottage-base.png`,
  earthMoon: `${C}/earth-from-moon.png`,
  lunarSurface: "/art/lunar-surface-craters.jpeg",
  rover: `${C}/lunar-rover.png`,
  panels: `${C}/solar-panels.png`,
  dish: `${C}/satellite-dish-comms.png`,
  waterTower: `${C}/water-tower.png`,
  crates: `${C}/supply-crates.png`,
  iconBattery: "/art/battery.png",
  iconWater: "/art/droplet.png",
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
