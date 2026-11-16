import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { BaseWorldScene } from "./scenes/BaseWorldScene";
import { IndoorScene } from "./scenes/IndoorScene";

/** Classic 16:9 adventure canvas (stable FIT scale — no DPR resize thrash). */
export function createMoonGame(parent: HTMLElement): Phaser.Game {
  const width = 960;
  const height = 540;

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: "#1a1410",
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width,
      height,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: true,
    },
    scene: [BootScene, BaseWorldScene, IndoorScene],
    input: { keyboard: true, mouse: true, touch: true },
  });
}
