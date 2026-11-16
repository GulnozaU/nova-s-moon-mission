import Phaser from "phaser";
import { THEME } from "./theme";
import { reduceMotion } from "./anim";

export const DWELL_MS = 700;
/** Must stay nearly still — walking through does not fill the ring. */
export const STILL_SPEED = 28;

export type DwellCircleOpts = {
  id: string;
  x: number;
  y: number;
  label: string;
  /** Always visible under the circle, e.g. "-2 power · saves 3 water". */
  costBenefit: string;
  radius?: number;
  /** When true, dwell toggles on→off; when false, only turns on (or custom). */
  onComplete: (wasOn: boolean) => void;
  getOn: () => boolean;
  /** Optional: hide / disable this circle. */
  isAvailable?: () => boolean;
};

/**
 * Glowing floor circle: stand still ~0.7s to fill the ring and switch a machine.
 */
export class DwellCircle {
  readonly id: string;
  readonly root: Phaser.GameObjects.Container;
  private ring: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Ellipse;
  private label: Phaser.GameObjects.Text;
  private cost: Phaser.GameObjects.Text;
  private onBadge: Phaser.GameObjects.Text;
  private progress = 0;
  private opts: DwellCircleOpts;
  private radius: number;

  constructor(scene: Phaser.Scene, opts: DwellCircleOpts) {
    this.opts = opts;
    this.id = opts.id;
    this.radius = opts.radius ?? 36;

    this.root = scene.add.container(opts.x, opts.y).setDepth(14);
    this.glow = scene.add
      .ellipse(0, 0, this.radius * 2.2, this.radius * 1.35, THEME.accent, 0.28)
      .setStrokeStyle(2, THEME.line, 0.25);
    this.ring = scene.add.graphics();
    this.label = scene.add
      .text(0, -this.radius - 8, opts.label, {
        fontFamily: THEME.fontDisplay,
        fontSize: "13px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 1);
    this.cost = scene.add
      .text(0, this.radius + 4, opts.costBenefit, {
        fontFamily: THEME.font,
        fontSize: "11px",
        color: THEME.inkSoft,
        backgroundColor: THEME.cream,
        padding: { x: 5, y: 2 },
        align: "center",
      })
      .setOrigin(0.5, 0);
    this.onBadge = scene.add
      .text(0, 0, "", {
        fontFamily: THEME.fontDisplay,
        fontSize: "12px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.root.add([this.glow, this.ring, this.label, this.cost, this.onBadge]);

    if (!reduceMotion()) {
      scene.tweens.add({
        targets: this.glow,
        alpha: { from: 0.22, to: 0.4 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    }
    this.refresh();
  }

  setCostBenefit(text: string) {
    this.opts.costBenefit = text;
    this.cost.setText(text);
  }

  contains(px: number, py: number): boolean {
    const dx = px - this.root.x;
    const dy = py - this.root.y;
    return Math.hypot(dx, dy) <= this.radius + 6;
  }

  /**
   * @param standingStill player nearly still inside the circle
   * @param dtMs frame delta
   */
  update(standingStill: boolean, dtMs: number) {
    const available = this.opts.isAvailable?.() ?? true;
    this.root.setVisible(available);
    this.root.setActive(available);
    if (!available) {
      this.progress = 0;
      this.drawRing(0);
      return;
    }

    if (!standingStill) {
      this.progress = 0;
      this.drawRing(0);
      this.refresh();
      return;
    }

    const step = reduceMotion() ? 1 : dtMs / DWELL_MS;
    this.progress = Math.min(1, this.progress + step);
    this.drawRing(this.progress);
    if (this.progress >= 1) {
      const wasOn = this.opts.getOn();
      this.progress = 0;
      this.drawRing(0);
      this.opts.onComplete(wasOn);
      this.refresh();
    }
  }

  refresh() {
    const on = this.opts.getOn();
    this.onBadge.setText(on ? "ON" : "");
    this.glow.setFillStyle(on ? THEME.good : THEME.accent, on ? 0.4 : 0.28);
    this.cost.setText(this.opts.costBenefit);
  }

  private drawRing(p: number) {
    this.ring.clear();
    if (p <= 0) return;
    this.ring.lineStyle(5, 0xffe08a, 0.95);
    this.ring.beginPath();
    this.ring.arc(
      0,
      0,
      this.radius + 4,
      Phaser.Math.DegToRad(-90),
      Phaser.Math.DegToRad(-90 + 360 * p),
      false,
    );
    this.ring.strokePath();
  }
}
