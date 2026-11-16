import Phaser from "phaser";
import { THEME } from "../theme";
import { audio } from "../../audio/audio";
import { morningTalk, type NovaChoice } from "../novaTalk";
import { bridge } from "../bridge";
import { clipWords } from "../novaTalk";

/**
 * Conversational morning briefing (days 2+): goal, story, pick a plan tease.
 */
export class MorningTalk {
  private panel: Phaser.GameObjects.Container | null = null;
  private open = false;

  constructor(scene: Phaser.Scene) {
    if (!bridge().ready()) return;
    const day = bridge().getDay();
    // Day 1 uses the arrow coach; still offer a short chat if day > 1,
    // and a tiny “what next” on day 1 after tutorial ends (coach handles first jobs).
    if (day < 1) return;
    if (day === 1) {
      this.show(
        scene,
        clipWords("Day 1: I will walk you through three jobs."),
        clipWords("Chip the radio, run the cleaner, then drag me to bed."),
        [
          {
            id: "lets_go",
            label: "Let's go",
            hint: "Follow the bouncing arrow. Drag chips onto the radio.",
          },
          {
            id: "skip_coach",
            label: "I know this",
            hint: "Explore rooms. Drag me to bed when you are done.",
          },
        ],
      );
      return;
    }
    const talk = morningTalk(
      bridge().getState(),
      bridge().getEvent(),
      bridge().getStormAlerts(),
      bridge().getCommsYesterday(),
    );
    this.show(scene, talk.goal, talk.story, talk.choices);
  }

  isOpen() {
    return this.open;
  }

  private show(
    scene: Phaser.Scene,
    goal: string,
    story: string,
    choices: NovaChoice[],
  ) {
    this.open = true;
    const { width: W, height: H } = scene.scale;
    this.panel = scene.add.container(W / 2, H * 0.42).setDepth(110).setScrollFactor(0);
    const bg = scene.add
      .rectangle(0, 0, Math.min(520, W - 36), 210, THEME.panel, 0.98)
      .setStrokeStyle(3, THEME.line, 0.25);
    const g = scene.add
      .text(0, -80, clipWords(goal), {
        fontFamily: THEME.fontDisplay,
        fontSize: "15px",
        color: THEME.ink,
        align: "center",
        wordWrap: { width: 480 },
      })
      .setOrigin(0.5);
    const s = scene.add
      .text(0, -40, clipWords(story), {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.inkSoft,
        align: "center",
        wordWrap: { width: 480 },
      })
      .setOrigin(0.5);
    const pick = scene.add
      .text(0, 0, "Which one do you pick?", {
        fontFamily: THEME.fontDisplay,
        fontSize: "13px",
        color: THEME.ink,
      })
      .setOrigin(0.5);

    this.panel.add([bg, g, s, pick]);

    choices.slice(0, 2).forEach((c, i) => {
      const btn = scene.add
        .text((i === 0 ? -1 : 1) * 110, 50, c.label, {
          fontFamily: THEME.fontDisplay,
          fontSize: "13px",
          color: THEME.ink,
          backgroundColor: "#ffe08a",
          padding: { x: 10, y: 8 },
          align: "center",
          wordWrap: { width: 180 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      btn.on("pointerdown", () => {
        audio.play("uiClick");
        if (c.patch) bridge().patchDecisions(c.patch);
        bridge().setNovaLine(clipWords(c.hint));
        this.close();
      });
      this.panel!.add(btn);
    });
  }

  private close() {
    this.panel?.destroy(true);
    this.panel = null;
    this.open = false;
  }
}
