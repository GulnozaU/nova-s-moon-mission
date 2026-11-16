import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { BaseWorldScene } from "./scenes/BaseWorldScene";

/** Classic 16:9 adventure canvas, crisp on retina (devicePixelRatio). */
export function createMoonGame(parent: HTMLElement): Phaser.Game {
  const width = 960;
  const height = 540;
  const dpr =
    typeof window !== "undefined"
      ? Math.min(window.devicePixelRatio || 1, 3)
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
      powerPreference: "high-performance",
      // Phaser 3.80 render resolution for HiDPI.
      ...({ resolution: dpr } as object),
    },
    scene: [BootScene, BaseWorldScene],
    input: { keyboard: true, mouse: true, touch: true },
    callbacks: {
      postBoot: (g) => {
        const canvas = g.canvas;
        if (canvas) {
          canvas.style.imageRendering = "auto";
        }
      },
    },
  });
  return game;
}
