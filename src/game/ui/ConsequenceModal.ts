import Phaser from "phaser";
import { bridge, type BridgeDelta } from "../bridge";
import { THEME } from "../theme";

/**
 * Short consequence scene after a choice (~8s feel, no scroll).
 * Floating +/- numbers, 3-icon summary, Next day button.
 */
export class ConsequenceModal {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private open = false;
  private title!: Phaser.GameObjects.Text;
  private whyLine!: Phaser.GameObjects.Text;
  private summary!: Phaser.GameObjects.Text;
  private tomorrow!: Phaser.GameObjects.Text;
  private floaters: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width: W, height: H } = scene.scale;
    this.root = scene.add.container(W / 2, H / 2).setDepth(96).setVisible(false);

    const dim = scene.add.rectangle(0, 0, W * 2, H * 2, 0x2a3348, 0.5);
    const panel = scene.add
      .rectangle(0, 0, Math.min(420, W - 40), Math.min(320, H - 48), THEME.panel)
      .setStrokeStyle(3, THEME.line, 0.2);

    this.title = scene.add
      .text(0, -130, "What changed", {
        fontFamily: THEME.fontDisplay,
        fontSize: "22px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.summary = scene.add
      .text(0, -70, "", {
        fontFamily: THEME.font,
        fontSize: "16px",
        color: THEME.ink,
        align: "center",
        wordWrap: { width: 360 },
      })
      .setOrigin(0.5);

    this.whyLine = scene.add
      .text(0, 10, "", {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.inkSoft,
        align: "center",
        wordWrap: { width: 360 },
      })
      .setOrigin(0.5);

    this.tomorrow = scene.add
      .text(0, 70, "", {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.ink,
        align: "center",
        wordWrap: { width: 360 },
      })
      .setOrigin(0.5);

    const next = this.makeBtn(0, 120, "Next day", () => {
      this.hide();
      bridge().continueAfterResult();
    });

    this.root.add([
      dim,
      panel,
      this.title,
      this.summary,
      this.whyLine,
      this.tomorrow,
      next,
    ]);
  }

  isOpen() {
    return this.open;
  }

  show() {
    if (!bridge().ready()) return;
    this.clearFloaters();
    const deltas = bridge().getDeltas().slice(0, 3);
    const icons = deltas.map((d) => this.iconLine(d)).join("   ");
    this.summary.setText(icons || "Steady day");
    const firstWhy = deltas[0]?.why ?? "The base kept running.";
    this.whyLine.setText(this.clipWords(firstWhy, 25));
    this.tomorrow.setText(
      this.clipWords(bridge().getTomorrowHint() || "Plan tomorrow's power.", 25),
    );
    this.root.setVisible(true);
    this.open = true;
    this.spawnFloaters(deltas);
  }

  hide() {
    this.clearFloaters();
    this.root.setVisible(false);
    this.open = false;
  }

  private iconLine(d: BridgeDelta): string {
    const delta = d.after - d.before;
    const sign = delta > 0 ? "+" : "";
    const short =
      d.key === "water"
        ? "💧"
        : d.key === "oxygen"
          ? "O₂"
          : d.key === "battery"
            ? "🔋"
            : d.key === "exposure"
              ? "♥"
              : d.key === "science"
                ? "🔬"
                : "📦";
    return `${short}${sign}${Number.isInteger(delta) ? delta : delta.toFixed(1)}`;
  }

  private spawnFloaters(deltas: BridgeDelta[]) {
    const { width: W, height: H } = this.scene.scale;
    deltas.forEach((d, i) => {
      const delta = d.after - d.before;
      const sign = delta > 0 ? "+" : "";
      const color = delta >= 0 ? THEME.sageInk : THEME.rose;
      const t = this.scene.add
        .text(
          W * (0.3 + i * 0.2),
          H * 0.55,
          `${sign}${Number.isInteger(delta) ? delta : delta.toFixed(1)} ${d.label}`,
          {
            fontFamily: THEME.fontDisplay,
            fontSize: "18px",
            color,
            fontStyle: "bold",
          },
        )
        .setOrigin(0.5)
        .setDepth(97);
      this.floaters.push(t);
      this.scene.tweens.add({
        targets: t,
        y: H * 0.35,
        alpha: 0,
        duration: 1800,
        ease: "Sine.out",
        onComplete: () => t.destroy(),
      });
    });
  }

  private clearFloaters() {
    for (const f of this.floaters) f.destroy();
    this.floaters = [];
  }

  private clipWords(text: string, max: number): string {
    const words = text.trim().split(/\s+/);
    if (words.length <= max) return text;
    return `${words.slice(0, max).join(" ")}…`;
  }

  private makeBtn(x: number, y: number, label: string, fn: () => void) {
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add
      .rectangle(0, 0, 200, 52, THEME.good)
      .setStrokeStyle(2, THEME.line, 0.2)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add
      .text(0, 0, label, {
        fontFamily: THEME.fontDisplay,
        fontSize: "18px",
        color: "#fff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    bg.on("pointerover", () => bg.setFillStyle(0x6f9870));
    bg.on("pointerout", () => bg.setFillStyle(THEME.good));
    bg.on("pointerdown", () => {
      bg.setFillStyle(0x5a7f5a);
      fn();
    });
    c.add([bg, text]);
    return c;
  }
}
