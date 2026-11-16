import Phaser from "phaser";
import { THEME } from "../theme";
import { ensureSoftPadTexture, workingLoop } from "../anim";
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
  /** Optional machine / prop art sitting on the soft pad (not a rectangle). */
  artKey?: string;
  artW?: number;
  artH?: number;
  isAvailable?: () => boolean;
};

/**
 * Drop target — soft farm-sim pad + optional art prop (no hard geometric boxes).
 */
export class JobStation {
  readonly id: string;
  readonly root: Phaser.GameObjects.Container;
  private opts: JobStationOpts;
  private radius: number;
  private pad: Phaser.GameObjects.Image;
  private prop: Phaser.GameObjects.Image | null = null;
  private label: Phaser.GameObjects.Text;
  private costText: Phaser.GameObjects.Text;
  private onBadge: Phaser.GameObjects.Text;
  private fillText: Phaser.GameObjects.Text;
  private worker: Phaser.GameObjects.Image | null = null;
  private workerTween: Phaser.Tweens.Tween | null = null;
  private accept: DragKind[];

  constructor(scene: Phaser.Scene, opts: JobStationOpts) {
    this.opts = opts;
    this.id = opts.id;
    this.radius = opts.radius ?? 34;
    this.accept = Array.isArray(opts.accept) ? opts.accept : [opts.accept];

    const padKey = ensureSoftPadTexture(scene);
    this.root = scene.add.container(opts.x, opts.y).setDepth(14);
    this.pad = scene.add
      .image(0, 8, padKey)
      .setDisplaySize(this.radius * 2.4, this.radius * 1.35)
      .setAlpha(0.7);

    if (opts.artKey && scene.textures.exists(opts.artKey)) {
      this.prop = scene.add
        .image(0, -6, opts.artKey)
        .setDisplaySize(opts.artW ?? 48, opts.artH ?? 40)
        .setOrigin(0.5, 0.85);
    }

    this.label = scene.add
      .text(0, -this.radius - (this.prop ? 18 : 4), opts.label, {
        fontFamily: THEME.fontDisplay,
        fontSize: "12px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1);
    this.costText = scene.add
      .text(0, this.radius + 6, formatCostsBenefits(opts.costs, opts.benefits), {
        fontFamily: THEME.font,
        fontSize: "11px",
        color: THEME.inkSoft,
        backgroundColor: THEME.cream,
        padding: { x: 5, y: 2 },
        align: "center",
      })
      .setOrigin(0.5, 0);
    this.onBadge = scene.add
      .text(0, this.prop ? -22 : -4, "", {
        fontFamily: THEME.fontDisplay,
        fontSize: "12px",
        color: THEME.sageInk,
        fontStyle: "bold",
        backgroundColor: THEME.cream,
        padding: { x: 4, y: 1 },
      })
      .setOrigin(0.5);
    this.fillText = scene.add
      .text(0, 14, "", {
        fontFamily: THEME.font,
        fontSize: "10px",
        color: THEME.inkSoft,
      })
      .setOrigin(0.5);

    const kids: Phaser.GameObjects.GameObject[] = [
      this.pad,
      this.label,
      this.costText,
      this.onBadge,
      this.fillText,
    ];
    if (this.prop) kids.splice(1, 0, this.prop);
    this.root.add(kids);
    // Names and costs live in the side rail so the painting stays clear.
    this.label.setVisible(false);
    this.costText.setVisible(false);
    this.onBadge.setVisible(false);
    this.fillText.setVisible(false);

    if (opts.workerKey && scene.textures.exists(opts.workerKey)) {
      this.worker = scene.add
        .image(18, -this.radius - 20, opts.workerKey)
        .setDisplaySize(26, 34)
        .setVisible(false)
        .setDepth(15);
      this.root.add(this.worker);
    }

    this.refresh();
  }

  /** One line for the side rail: name, cost, and whether it is on. */
  legendLine(): string | null {
    if (!(this.opts.isAvailable?.() ?? true)) return null;
    const on = this.opts.getOn();
    const trade = formatCostsBenefits(this.opts.costs, this.opts.benefits);
    return `${on ? "✓" : "·"} ${this.opts.label}${trade ? `  ${trade}` : ""}`;
  }

  accepts(payload: DragPayload): boolean {
    if (!(this.opts.isAvailable?.() ?? true)) return false;
    return this.accept.includes(payload.kind);
  }

  contains(px: number, py: number): boolean {
    return Math.hypot(px - this.root.x, py - this.root.y) <= this.radius + 12;
  }

  setHighlight(on: boolean) {
    this.pad.setTint(on ? 0xffe08a : 0xffffff);
    this.pad.setAlpha(on ? 0.95 : 0.7);
    if (this.prop) this.prop.setScale(on ? 1.08 : 1);
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
    this.pad.setTint(on ? 0xb8e0a8 : 0xffffff);
    this.pad.setAlpha(on ? 0.9 : 0.65);
    if (this.prop) this.prop.setAlpha(on ? 1 : 0.92);
    const need = this.opts.chipCost ?? 0;
    const fill = this.opts.getFill?.() ?? 0;
    if (!on && need > 1) {
      this.fillText.setText(`${fill}/${need} chips`);
    } else if (!on && need === 1 && this.accept.includes("chip")) {
      this.fillText.setText("↓ DROP CHIP HERE");
    } else if (!on && this.accept.includes("water")) {
      this.fillText.setText("↓ DROP WATER HERE");
    } else if (!on && this.accept.includes("nova")) {
      this.fillText.setText("↓ DROP NOVA HERE");
    } else if (!on && this.accept.includes("material")) {
      this.fillText.setText("↓ DROP PARTS HERE");
    } else {
      this.fillText.setText("");
    }
    if (this.worker) {
      this.worker.setVisible(on);
      if (on && !this.workerTween) {
        this.workerTween = workingLoop(this.root.scene, this.worker);
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
