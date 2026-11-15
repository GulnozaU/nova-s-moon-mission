/** Storybook art under /public/art (local illustrations, not NASA stills). */

export const ART = {
  nova: "/art/nova-astronaut-boy.jpg",
  novaGirlHelmet: "/art/astronaut-girl-with-helmet.jpg",
  novaGirlGlasses: "/art/astronaut-girl-with-glasses.jpg",
  lab: "/art/science-lab-nova-notebook.jpeg",
  bunks: "/art/crew-quarters-bunks.jpeg",
  greenhouseIn: "/art/greenhouse-interior.jpeg",
  greenhouseDome: "/art/greenhouse-dome.jpeg",
  habitatDome: "/art/habitat-dome.jpg",
  cottage: "/art/stone-cottage-base.jpeg",
  earthMoon: "/art/earth-from-moon.jpeg",
  lunarSurface: "/art/lunar-surface-craters.jpeg",
  rover: "/art/lunar-rover.jpeg",
  panels: "/art/solar-panels.jpeg",
  dish: "/art/satellite-dish-comms.jpeg",
  waterTower: "/art/water-tower.jpeg",
  crates: "/art/supply-crates.jpeg",
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
