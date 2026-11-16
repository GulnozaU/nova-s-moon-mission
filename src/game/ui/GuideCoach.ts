import Phaser from "phaser";
import { THEME } from "../theme";
import { reduceMotion } from "../anim";
import {
  currentStep,
  type TutorialState,
  type TutorialStep,
} from "../tutorial/day1";
import { clipWords } from "../novaTalk";

/**
 * Bouncing arrow + glowing target + one Nova line for Day-1 tutorial.
 */
export class GuideCoach {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private arrow: Phaser.GameObjects.Text;
  private glow: Phaser.GameObjects.Ellipse;
  private line: Phaser.GameObjects.Text;
  private bounce: Phaser.Tweens.Tween | null = null;
  private pulse: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(95).setScrollFactor(0);
    this.glow = scene.add
      .ellipse(0, 0, 70, 44, 0xffe08a, 0.35)
      .setStrokeStyle(3, 0xffe08a, 0.9)
      .setVisible(false);
    this.arrow = scene.add
      .text(0, 0, "▼", {
        fontFamily: THEME.fontDisplay,
        fontSize: "28px",
        color: "#ffe08a",
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.line = scene.add
      .text(scene.scale.width / 2, 70, "", {
        fontFamily: THEME.font,
        fontSize: "14px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 10, y: 6 },
        align: "center",
        wordWrap: { width: scene.scale.width - 48 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(96)
      .setVisible(false);
    this.root.add([this.glow, this.arrow]);
  }

  /** Point at a world position; line from tutorial state. */
  sync(
    state: TutorialState,
    worldTargets: Partial<Record<TutorialStep["target"], { x: number; y: number }>>,
    currentRoom: TutorialStep["room"],
  ) {
    const step = currentStep(state);
    if (!step) {
      this.hide();
      return;
    }
    // Instruction text stays in the left rail (Nova). The arrow only marks the glow.
    this.line.setText(clipWords(step.line, 28));
    this.line.setVisible(false);

    const inRoom =
      step.room === "any" ||
      step.room === currentRoom ||
      (step.room === "surface" && currentRoom === "surface");
    if (!inRoom) {
      this.glow.setVisible(false);
      this.arrow.setVisible(false);
      this.bounce?.stop();
      this.pulse?.stop();
      return;
    }

    const pos = worldTargets[step.target];
    if (!pos || step.target === "none") {
      this.glow.setVisible(false);
      this.arrow.setVisible(false);
      return;
    }

    // Convert world → screen if camera scrolled (we use fixed camera).
    this.glow.setPosition(pos.x, pos.y).setVisible(true);
    this.arrow.setPosition(pos.x, pos.y - 42).setVisible(true);
    this.root.setScrollFactor(0);

    // Re-parent glow/arrow in world space (not HUD scrollFactor).
    this.glow.setScrollFactor(1);
    this.arrow.setScrollFactor(1);

    if (!reduceMotion()) {
      this.bounce?.stop();
      this.pulse?.stop();
      this.bounce = this.scene.tweens.add({
        targets: this.arrow,
        y: pos.y - 54,
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
      this.pulse = this.scene.tweens.add({
        targets: this.glow,
        alpha: { from: 0.25, to: 0.55 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  hide() {
    this.glow.setVisible(false);
    this.arrow.setVisible(false);
    this.line.setVisible(false);
    this.bounce?.stop();
    this.pulse?.stop();
  }

  destroy() {
    this.hide();
    this.root.destroy(true);
    this.line.destroy();
  }
}
