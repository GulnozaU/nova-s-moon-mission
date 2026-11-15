import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { BaseWorldScene } from "./scenes/BaseWorldScene";
import { IndoorScene } from "./scenes/IndoorScene";

export function createMoonGame(parent: HTMLElement): Phaser.Game {
  const w = Math.max(800, parent.clientWidth || window.innerWidth);
  const h = Math.max(560, parent.clientHeight || Math.floor(window.innerHeight * 0.78));

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: w,
    height: h,
    backgroundColor: "#1a1520",
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: w,
      height: h,
    },
    scene: [BootScene, BaseWorldScene, IndoorScene],
    input: { keyboard: true, mouse: true, touch: true },
  });
}
