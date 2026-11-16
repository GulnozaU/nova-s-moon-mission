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
 * Power chip tray — leftover chips are draggable onto jobs.
 * Heat is always reserved in plannedPowerCost. Unused chips carry to battery (cap).
 */
export class ChipTray {
  private root: Phaser.GameObjects.Container;
  private title: Phaser.GameObjects.Text;
  private cells: Phaser.GameObjects.Rectangle[] = [];
  private cellHit: Phaser.GameObjects.Zone[] = [];
  private meta: Phaser.GameObjects.Text;
  private lastKey = "";
  private drag: DragController | null = null;
  /** Extra chips held on partial machine fills (not yet in decisions). */
  private heldExtra = 0;

  constructor(scene: Phaser.Scene, x = 10, y = 8) {
    this.root = scene.add.container(x, y).setDepth(80).setScrollFactor(0);
    this.title = scene.add.text(0, 0, "Power chips", {
      fontFamily: THEME.fontDisplay,
      fontSize: "12px",
      color: THEME.ink,
      backgroundColor: THEME.cream,
      padding: { x: 6, y: 3 },
    });
    this.root.add(this.title);
    for (let i = 0; i < 20; i++) {
      const cx = 6 + i * 16;
      const cy = 24;
      const cell = scene.add
        .rectangle(cx, cy, 12, 18, 0x6a6570, 0.35)
        .setStrokeStyle(1, THEME.line, 0.3)
        .setVisible(false);
      const zone = scene.add.zone(cx, cy, 14, 22);
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
        if (!this.drag || !bridge().ready()) return;
        const left = this.freeChips();
        // Free chips are drawn in slots 0..left-1
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
    this.meta = scene.add.text(0, 48, "", {
      fontFamily: THEME.font,
      fontSize: "11px",
      color: THEME.ink,
      backgroundColor: THEME.cream,
      padding: { x: 6, y: 3 },
    });
    this.root.add(this.meta);
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
      `Day ${s.day}/10 · ${left} free (heat −${HEAT_COST}) · bat ≤${BATTERY_CAP}`,
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
        cell.setFillStyle(0xffe08a, 0.95);
        zone.setInteractive({ useHandCursor: true });
      } else {
        cell.setFillStyle(0x6a6570, 0.4);
        zone.disableInteractive();
      }
    }
    this.meta.setText(
      `Science ${s.science}/${SCIENCE_SUCCESS_TARGET} · 💧${s.water} O₂${s.oxygen} · 📦${s.materials} · bat ${s.battery}`,
    );
  }
}
