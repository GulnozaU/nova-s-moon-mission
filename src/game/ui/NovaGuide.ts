import Phaser from "phaser";
import { THEME } from "../theme";
import { idleBreathe, reduceMotion } from "../anim";
import { clipWords } from "../novaTalk";
import { bridge } from "../bridge";
import type { DragController } from "../drag/DragController";
import { audio } from "../../audio/audio";

/**
 * Fixed corner Nova — big soft-pixel coach who talks through jobs + effects.
 * Optional: drag her portrait onto Bed / Shelter (no walking required).
 */
export class NovaGuide {
  private root: Phaser.GameObjects.Container;
  private bubble: Phaser.GameObjects.Text;
  private face: Phaser.GameObjects.Image;
  private last = "";
  /** True until React echoes the line we just sent, so a stale line cannot wipe it. */
  private pending = false;

  constructor(scene: Phaser.Scene, drag?: DragController | null) {
    const { height: H } = scene.scale;
    this.root = scene.add.container(10, H - 8).setDepth(120).setScrollFactor(0);

    const panel = scene.add
      .rectangle(0, 0, 232, 128, THEME.panel, 0.98)
      .setOrigin(0, 1)
      .setStrokeStyle(3, THEME.line, 0.4);

    this.face = scene.add
      .image(8, -6, "nova")
      .setOrigin(0, 1)
      .setDisplaySize(48, 62);

    const name = scene.add
      .text(62, -116, "Nova", {
        fontFamily: THEME.fontDisplay,
        fontSize: "14px",
        color: THEME.ink,
      })
      .setOrigin(0, 0);

    this.bubble = scene.add
      .text(62, -96, "I am here. I will tell you what to try.", {
        fontFamily: THEME.font,
        fontSize: "12px",
        color: THEME.ink,
        wordWrap: { width: 160 },
        lineSpacing: 1,
      })
      .setOrigin(0, 0);

    this.root.add([panel, this.face, name, this.bubble]);

    if (!reduceMotion()) idleBreathe(scene, this.face);

    if (drag) {
      this.face.setInteractive({ useHandCursor: true });
      this.face.on("pointerdown", (p: Phaser.Input.Pointer) => {
        p.event.stopPropagation();
        audio.play("pick");
        drag.begin({ kind: "nova", amount: 1, sourceId: "nova" }, p.worldX, p.worldY);
        this.say("Drop me on the bunk to end the day — or on Home in a storm.");
      });
    }

    this.syncFromBridge();
  }

  say(line: string) {
    const t = clipWords(line, 28);
    if (t === this.last) return;
    this.last = t;
    this.pending = true;
    this.bubble.setText(t);
    if (bridge().ready()) bridge().setNovaLine(t);
  }

  /** Explain a completed job with real resource effect. */
  explainJob(effect: string) {
    this.say(effect);
  }

  syncFromBridge() {
    if (!bridge().ready()) return;
    const line = bridge().getNovaLine();
    if (!line) return;
    if (line === this.last) {
      this.pending = false;
      return;
    }
    if (this.pending) return;
    this.say(line);
  }

  destroy() {
    this.root.destroy(true);
  }
}
