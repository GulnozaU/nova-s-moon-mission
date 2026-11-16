import Phaser from "phaser";
import { THEME } from "../theme";
import { workingLoop } from "../anim";
import type { DragKind, DragPayload, DropAccept } from "../drag/types";

export type CostIcon = {
  /** Short icon glyph or emoji used as kid-facing cost/benefit. */
  icon: string;
  /** Signed number shown beside icon (e.g. -2, +3). */
  value: number | string;
};

export type JobStationOpts = {
  id: string;
  x: number;
  y: number;
  label: string;
  /** Cost row (left). */
  costs: CostIcon[];
  /** Benefit row (right). */
  benefits: CostIcon[];
  accept: DropAccept;
  /** Chips needed before the job turns on (chip jobs). Default 1. */
  chipCost?: number;
  radius?: number;
  getOn: () => boolean;
  /** Partial fill toward chipCost (scene-owned). */
  getFill?: () => number;
  /** Called when a valid payload lands. Return false to reject. */
  onDrop: (payload: DragPayload) => boolean;
  /** Optional worker art key when powered. */
  workerKey?: string;
  isAvailable?: () => boolean;
};

/**
 * Drop target with icon+number cost/benefit, fill pips, and a worker when ON.
 */
export class JobStation {
  readonly id: string;
  readonly root: Phaser.GameObjects.Container;
  private opts: JobStationOpts;
  private radius: number;
  private pad: Phaser.GameObjects.Ellipse;
  private label: Phaser.GameObjects.Text;
  private costText: Phaser.GameObjects.Text;
  private onBadge: Phaser.GameObjects.Text;
  private fillText: Phaser.GameObjects.Text;
  private worker: Phaser.GameObjects.Image | Phaser.GameObjects.Ellipse | null = null;
  private workerTween: Phaser.Tweens.Tween | null = null;
  private accept: DragKind[];

  constructor(scene: Phaser.Scene, opts: JobStationOpts) {
    this.opts = opts;
    this.id = opts.id;
    this.radius = opts.radius ?? 34;
    this.accept = Array.isArray(opts.accept) ? opts.accept : [opts.accept];

    this.root = scene.add.container(opts.x, opts.y).setDepth(14);
    this.pad = scene.add
      .ellipse(0, 0, this.radius * 2.1, this.radius * 1.3, THEME.accent, 0.22)
      .setStrokeStyle(2, THEME.line, 0.28);
    this.label = scene.add
      .text(0, -this.radius - 6, opts.label, {
        fontFamily: THEME.fontDisplay,
        fontSize: "12px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1);
    this.costText = scene.add
      .text(0, this.radius + 2, formatCostsBenefits(opts.costs, opts.benefits), {
        fontFamily: THEME.font,
        fontSize: "11px",
        color: THEME.inkSoft,
        backgroundColor: THEME.cream,
        padding: { x: 5, y: 2 },
        align: "center",
      })
      .setOrigin(0.5, 0);
    this.onBadge = scene.add
      .text(0, -4, "", {
        fontFamily: THEME.fontDisplay,
        fontSize: "12px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.fillText = scene.add
      .text(0, 10, "", {
        fontFamily: THEME.font,
        fontSize: "10px",
        color: THEME.inkSoft,
      })
      .setOrigin(0.5);
    this.root.add([this.pad, this.label, this.costText, this.onBadge, this.fillText]);

    if (opts.workerKey && scene.textures.exists(opts.workerKey)) {
      this.worker = scene.add
        .image(0, -this.radius - 28, opts.workerKey)
        .setDisplaySize(28, 36)
        .setVisible(false)
        .setDepth(15);
      this.root.add(this.worker);
    } else {
      this.worker = scene.add
        .ellipse(0, -this.radius - 22, 16, 22, 0xe8c4a8, 0.95)
        .setStrokeStyle(1, THEME.line, 0.35)
        .setVisible(false);
      this.root.add(this.worker);
    }

    this.refresh();
  }

  accepts(payload: DragPayload): boolean {
    if (!(this.opts.isAvailable?.() ?? true)) return false;
    return this.accept.includes(payload.kind);
  }

  contains(px: number, py: number): boolean {
    return Math.hypot(px - this.root.x, py - this.root.y) <= this.radius + 10;
  }

  setHighlight(on: boolean) {
    this.pad.setStrokeStyle(3, on ? 0xffe08a : THEME.line, on ? 0.95 : 0.28);
    this.pad.setFillStyle(on ? 0xffe08a : THEME.accent, on ? 0.45 : 0.22);
  }

  receive(payload: DragPayload): boolean {
    if (!this.accepts(payload)) return false;
    return this.opts.onDrop(payload);
  }

  refresh() {
    const available = this.opts.isAvailable?.() ?? true;
    this.root.setVisible(available);
    const on = this.opts.getOn();
    this.onBadge.setText(on ? "ON" : "");
    this.pad.setFillStyle(on ? THEME.good : THEME.accent, on ? 0.38 : 0.22);
    const need = this.opts.chipCost ?? 0;
    const fill = this.opts.getFill?.() ?? 0;
    if (!on && need > 1) {
      this.fillText.setText(`${fill}/${need} chips`);
    } else if (!on && need === 1 && this.accept.includes("chip")) {
      this.fillText.setText("drop chip");
    } else {
      this.fillText.setText("");
    }
    if (this.worker) {
      this.worker.setVisible(on);
      if (on && !this.workerTween) {
        this.workerTween = workingLoop(this.root.scene, this.worker as Phaser.GameObjects.Image);
      } else if (!on && this.workerTween) {
        this.workerTween.stop();
        this.workerTween = null;
        this.worker.setAngle(0);
      }
    }
  }
}

function formatCostsBenefits(costs: CostIcon[], benefits: CostIcon[]): string {
  const left = costs.map((c) => `${c.icon}${fmt(c.value)}`).join(" ");
  const right = benefits.map((b) => `${b.icon}${fmt(b.value)}`).join(" ");
  if (left && right) return `${left}  →  ${right}`;
  return left || right;
}

function fmt(v: number | string): string {
  if (typeof v === "string") return v;
  return v > 0 ? `+${v}` : `${v}`;
}
