import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { BaseWorldScene } from "./scenes/BaseWorldScene";
import { IndoorScene } from "./scenes/IndoorScene";

/**
 * Compact 16:9 stage. Backing store uses devicePixelRatio for crispness
 * without changing world coordinates (avoids resize thrash).
 */
export function createMoonGame(parent: HTMLElement): Phaser.Game {
  const width = 960;
  const height = 540;
  const dpr =
    typeof window !== "undefined"
      ? Math.min(Math.max(window.devicePixelRatio || 1, 1), 2)
      : 1;

  const game = new Phaser.Game({
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
      roundPixels: false,
      ...( { resolution: dpr } as object),
    },
    scene: [BootScene, BaseWorldScene, IndoorScene],
    input: { keyboard: true, mouse: true, touch: true },
    callbacks: {
      postBoot: (g) => {
        if (g.canvas) g.canvas.style.imageRendering = "auto";
      },
    },
  });
  return game;
}
