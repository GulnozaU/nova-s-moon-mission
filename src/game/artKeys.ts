import { ART } from "../ui/art";

/** Map logical keys → public URLs for Phaser load.image */
export const PHASER_ART = {
  nova: ART.nova,
  girl: ART.novaGirlHelmet,
  worker: ART.novaGirlGlasses,
  surface: ART.lunarSurface,
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
} as const;

export type PhaserArtKey = keyof typeof PHASER_ART;
