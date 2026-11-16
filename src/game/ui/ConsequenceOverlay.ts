import Phaser from "phaser";
import { THEME } from "../theme";
import { floatNumber, reduceMotion } from "../anim";
import { audio } from "../../audio/audio";
import type { BridgeDelta } from "../bridge";
import { clipWords, consequenceNovaLine } from "../novaTalk";

const ICONS: Record<string, string> = {
  water: "💧",
  oxygen: "O₂",
  battery: "⚡",
  materials: "📦",
  exposure: "⚠",
  science: "🔬",
};

/**
 * ~8s consequence beat after bed: animate resources, Nova line,
 * 3-icon summary, tap to continue. ≤25 words on screen.
 */
export class ConsequenceOverlay {
  private root: Phaser.GameObjects.Container;
  private closed = false;

  constructor(
    scene: Phaser.Scene,
    deltas: BridgeDelta[],
    onContinue: () => void,
  ) {
    const { width: W, height: H } = scene.scale;
    this.root = scene.add.container(0, 0).setDepth(200).setScrollFactor(0);
    const veil = scene.add.rectangle(W / 2, H / 2, W, H, 0x1a1410, 0.72);
    this.root.add(veil);

    audio.play("dayJingle");

    const changed = deltas.filter((d) => d.after !== d.before).slice(0, 3);
    const title = scene.add
      .text(W / 2, H * 0.22, clipWords("Night falls. Here's what changed."), {
        fontFamily: THEME.fontDisplay,
        fontSize: "16px",
        color: THEME.cream,
        align: "center",
        wordWrap: { width: W - 60 },
      })
      .setOrigin(0.5);
    this.root.add(title);

    // Animate resource floaters (~first 3s)
    changed.forEach((d, i) => {
      const delta = d.after - d.before;
      const label = `${ICONS[d.key] ?? ""} ${delta > 0 ? "+" : ""}${
        Number.isInteger(delta) ? delta : delta.toFixed(1)
      }`;
      scene.time.delayedCall(400 + i * 500, () => {
        if (this.closed) return;
        floatNumber(
          scene,
          W * (0.3 + i * 0.2),
          H * 0.4,
          label,
          delta >= 0 ? THEME.sageInk : THEME.rose,
        );
        audio.play(delta >= 0 ? "resourceUp" : "resourceDown");
      });
    });

    // Nova reacts (~4s)
    const nova = scene.add
      .text(W / 2, H * 0.55, "", {
        fontFamily: THEME.font,
        fontSize: "15px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 12, y: 8 },
        align: "center",
        wordWrap: { width: W - 80 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.root.add(nova);
    scene.time.delayedCall(3200, () => {
      if (this.closed) return;
      nova.setText(consequenceNovaLine(deltas));
      if (reduceMotion()) nova.setAlpha(1);
      else scene.tweens.add({ targets: nova, alpha: 1, duration: 300 });
    });

    // 3-icon summary (~6s)
    const summary = scene.add.container(W / 2, H * 0.7).setAlpha(0);
    changed.forEach((d, i) => {
      const delta = d.after - d.before;
      const cell = scene.add
        .text((i - 1) * 90, 0, `${ICONS[d.key] ?? "·"}\n${delta > 0 ? "+" : ""}${Number.isInteger(delta) ? delta : delta.toFixed(0)}`, {
          fontFamily: THEME.fontDisplay,
          fontSize: "18px",
          color: THEME.cream,
          align: "center",
        })
        .setOrigin(0.5);
      summary.add(cell);
    });
    this.root.add(summary);
    scene.time.delayedCall(5500, () => {
      if (this.closed) return;
      if (reduceMotion()) summary.setAlpha(1);
      else scene.tweens.add({ targets: summary, alpha: 1, duration: 280 });
    });

    const tip = scene.add
      .text(W / 2, H * 0.86, "tap to continue", {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.cream,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.root.add(tip);
    scene.time.delayedCall(7000, () => {
      if (this.closed) return;
      tip.setAlpha(1);
    });

    const hit = scene.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.001)
      .setInteractive();
    this.root.add(hit);
    let ready = false;
    scene.time.delayedCall(7500, () => {
      ready = true;
    });
    hit.on("pointerdown", () => {
      if (!ready || this.closed) return;
      this.closed = true;
      audio.play("uiClick");
      this.root.destroy(true);
      onContinue();
    });
  }
}
