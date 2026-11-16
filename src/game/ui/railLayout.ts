import Phaser from "phaser";

/**
 * All reading lives in the left column.
 * The painted base keeps its own 960×540 frame on the right, so labels
 * never sit on the buildings.
 */
export const RAIL_W = 252;
export const WORLD_W = 960;
export const WORLD_H = 540;

export function worldX(u: number): number {
  return RAIL_W + u * WORLD_W;
}

export function worldY(v: number): number {
  return v * WORLD_H;
}

export function paintSideRail(scene: Phaser.Scene): void {
  const h = scene.scale.height;
  scene.add
    .rectangle(0, 0, RAIL_W, h, 0xfff8ef, 1)
    .setOrigin(0, 0)
    .setDepth(70)
    .setScrollFactor(0);
  scene.add
    .rectangle(RAIL_W - 3, 0, 3, h, 0x3a3348, 0.22)
    .setOrigin(0, 0)
    .setDepth(71)
    .setScrollFactor(0);
}
