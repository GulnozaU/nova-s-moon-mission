import Phaser from "phaser";
import { bridge } from "../bridge";
import { plannedPowerCost } from "../../ui/powerMath";
import {
  HEAT_COST,
  SCIENCE_SUCCESS_TARGET,
} from "../../engine/constants";
import { siteShortName } from "../siteCopy";
import { THEME } from "../theme";
import type { DragController } from "../drag/DragController";

/**
 * Energy sits in the left column as bolt marks you can drag.
 * Bolts are their own hit targets (not a photo inside a container), so the
 * pointer actually lands on them.
 */
export class ChipTray {
  private scene: Phaser.Scene;
  private originX: number;
  private originY: number;
  private title: Phaser.GameObjects.Text;
  private bolts: Phaser.GameObjects.Text[] = [];
  private meta: Phaser.GameObjects.Text;
  private water: Phaser.GameObjects.Text | null = null;
  private lastKey = "";
  private drag: DragController | null = null;
  private heldExtra = 0;

  constructor(scene: Phaser.Scene, x = 10, y = 170) {
    this.scene = scene;
    this.originX = x;
    this.originY = y;

    this.title = scene.add
      .text(x, y, "Energy", {
        fontFamily: THEME.fontDisplay,
        fontSize: "14px",
        color: THEME.ink,
      })
      .setDepth(101)
      .setScrollFactor(0);

    for (let i = 0; i < 16; i++) {
      const col = i % 8;
      const row = Math.floor(i / 8);
      const bolt = scene.add
        .text(x + 12 + col * 26, y + 24 + row * 26, "⚡", {
          fontFamily: THEME.font,
          fontSize: "20px",
        })
        .setOrigin(0.5)
        .setDepth(102)
        .setScrollFactor(0)
        .setVisible(false);
      const index = i;
      bolt.on("pointerdown", (p: Phaser.Input.Pointer) => {
        if (!this.drag || !bridge().ready()) return;
        if (index >= this.freeChips()) return;
        p.event.stopPropagation();
        this.drag.begin(
          { kind: "chip", amount: 1, sourceId: `chip-${index}` },
          p.x,
          p.y,
        );
      });
      this.bolts.push(bolt);
    }

    this.meta = scene.add
      .text(x, y + 78, "", {
        fontFamily: THEME.font,
        fontSize: "11px",
        color: THEME.inkSoft,
        wordWrap: { width: 220 },
      })
      .setDepth(101)
      .setScrollFactor(0);

    this.refresh(true);
  }

  /** Greenhouse water. A drop in the left column, not a picture on the plants. */
  showWater(amount: number) {
    if (this.water) return;
    const drop = this.scene.add
      .text(this.originX, this.originY + 78, "💧  water", {
        fontFamily: THEME.font,
        fontSize: "16px",
        color: THEME.ink,
      })
      .setDepth(102)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    drop.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!this.drag) return;
      p.event.stopPropagation();
      this.drag.begin({ kind: "water", amount }, p.x, p.y, 0x3a7ca5);
    });
    this.water = drop;
    this.meta.setY(this.originY + 104);
  }

  setDrag(drag: DragController) {
    this.drag = drag;
  }

  setHeldExtra(n: number) {
    this.heldExtra = Math.max(0, n);
  }

  freeChips(): number {
    if (!bridge().ready()) return 0;
    const power = bridge().getPowerToday();
    const spent = plannedPowerCost(bridge().getDecisions());
    return Math.max(0, power - spent - this.heldExtra);
  }

  refresh(force = false) {
    if (!bridge().ready()) return;
    const power = bridge().getPowerToday();
    const spent = plannedPowerCost(bridge().getDecisions());
    const left = Math.max(0, power - spent - this.heldExtra);
    const s = bridge().getState();
    const key = `${s.site}|${s.day}|${power}|${left}|${spent}|${this.heldExtra}|${s.science}|${s.water}|${s.oxygen}|${s.battery}|${s.materials}`;
    if (!force && key === this.lastKey) return;
    this.lastKey = key;

    this.title.setText(
      left > 0
        ? `Energy · ${left} · ${siteShortName(s.site)}`
        : `Energy · heat uses ${HEAT_COST}`,
    );

    for (let i = 0; i < this.bolts.length; i++) {
      const bolt = this.bolts[i]!;
      if (i >= power) {
        bolt.setVisible(false);
        bolt.disableInteractive();
        continue;
      }
      bolt.setVisible(true);
      if (i < left) {
        bolt.setAlpha(1);
        bolt.setInteractive({ useHandCursor: true });
      } else {
        bolt.setAlpha(0.28);
        bolt.disableInteractive();
      }
    }

    this.meta.setText(
      `Day ${s.day}/10 · Sci ${s.science}/${SCIENCE_SUCCESS_TARGET}  💧${s.water}  O₂${s.oxygen}  📦${s.materials}  bat ${s.battery}`,
    );
  }
}
