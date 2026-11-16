import Phaser from "phaser";
import { bridge } from "../bridge";
import { plannedPowerCost } from "../../ui/powerMath";
import {
  BATTERY_CAP,
  HEAT_COST,
  SCIENCE_SUCCESS_TARGET,
} from "../../engine/constants";
import { THEME } from "../theme";
import type { DragController } from "../drag/DragController";

/**
 * Clear power-chip tray — big yellow “DRAG THESE” strip so kids see the inventory.
 */
export class ChipTray {
  private root: Phaser.GameObjects.Container;
  private title: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private cells: Phaser.GameObjects.Image[] = [];
  private cellHit: Phaser.GameObjects.Zone[] = [];
  private meta: Phaser.GameObjects.Text;
  private lastKey = "";
  private drag: DragController | null = null;
  private heldExtra = 0;
  constructor(scene: Phaser.Scene, x = 10, y = 8) {
    this.root = scene.add.container(x, y).setDepth(100).setScrollFactor(0);

    const bg = scene.add
      .rectangle(0, 0, 360, 78, 0xfff3c4, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(3, THEME.line, 0.45);
    this.root.add(bg);

    this.title = scene.add.text(10, 6, "POWER CHIPS — drag onto glowing jobs", {
      fontFamily: THEME.fontDisplay,
      fontSize: "13px",
      color: THEME.ink,
    });
    this.root.add(this.title);

    this.hint = scene.add.text(10, 24, "Free chips glow · spent chips are dim", {
      fontFamily: THEME.font,
      fontSize: "11px",
      color: THEME.inkSoft,
    });
    this.root.add(this.hint);

    if (
      !scene.textures.exists("chip") &&
      !scene.textures.exists("chipSoft") &&
      !scene.textures.exists("zap")
    ) {
      const g = scene.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffe08a, 1);
      g.fillRoundedRect(1, 1, 16, 20, 3);
      g.lineStyle(2, 0x3a3348, 0.45);
      g.strokeRoundedRect(1, 1, 16, 20, 3);
      g.generateTexture("chipSoft", 18, 22);
      g.destroy();
    }
    const chipKey = scene.textures.exists("chip")
      ? "chip"
      : scene.textures.exists("zap")
        ? "zap"
        : "chipSoft";

    for (let i = 0; i < 16; i++) {
      const cx = 18 + i * 22;
      const cy = 54;
      const cell = scene.add
        .image(cx, cy, chipKey)
        .setDisplaySize(20, 20)
        .setVisible(false);
      const zone = scene.add.zone(cx, cy, 22, 24);
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
        if (!this.drag || !bridge().ready()) return;
        const left = this.freeChips();
        if (i >= left) return;
        p.event.stopPropagation();
        this.drag.begin(
          { kind: "chip", amount: 1, sourceId: `chip-${i}` },
          p.worldX,
          p.worldY,
        );
      });
      this.root.add(cell);
      this.root.add(zone);
      this.cells.push(cell);
      this.cellHit.push(zone);
    }

    this.meta = scene.add.text(10, 82, "", {
      fontFamily: THEME.font,
      fontSize: "12px",
      color: THEME.ink,
      backgroundColor: THEME.cream,
      padding: { x: 6, y: 3 },
    });
    this.root.add(this.meta);

    // Soft pulse so the tray is noticed on Day 1.
    scene.tweens.add({
      targets: bg,
      alpha: { from: 0.92, to: 1 },
      duration: 700,
      yoyo: true,
      repeat: 4,
    });

    this.refresh(true);
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
    const key = `${s.day}|${power}|${left}|${spent}|${this.heldExtra}|${s.science}|${s.water}|${s.oxygen}|${s.battery}|${s.materials}`;
    if (!force && key === this.lastKey) return;
    this.lastKey = key;

    this.title.setText(
      left > 0
        ? `POWER CHIPS — ${left} free · drag onto glowing jobs`
        : `POWER CHIPS — none free (heat −${HEAT_COST} already reserved)`,
    );
    this.hint.setText(
      `Day ${s.day}/10 · battery carry ≤${BATTERY_CAP} · tap a yellow chip`,
    );

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i]!;
      const zone = this.cellHit[i]!;
      if (i >= power) {
        cell.setVisible(false);
        zone.disableInteractive();
        continue;
      }
      cell.setVisible(true);
      if (i < left) {
        cell.setTint(0xffffff);
        cell.setAlpha(1);
        cell.setScale(1.05);
        zone.setInteractive({ useHandCursor: true });
      } else {
        cell.setTint(0x888888);
        cell.setAlpha(0.4);
        cell.setScale(0.9);
        zone.disableInteractive();
      }
    }

    this.meta.setText(
      `Science ${s.science}/${SCIENCE_SUCCESS_TARGET} · 💧${s.water}  O₂${s.oxygen}  📦${s.materials}  bat ${s.battery}`,
    );
  }
}
