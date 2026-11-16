import Phaser from "phaser";
import { THEME } from "../theme";
import { audio } from "../../audio/audio";
import { morningTalk, type NovaChoice } from "../novaTalk";
import { bridge } from "../bridge";
import { clipWords } from "../novaTalk";
import { RAIL_W } from "./railLayout";

/** One briefing per day — coming back to the surface should not cover the chips again. */
let shownForDay = -1;

/**
 * Conversational morning briefing (days 2+): goal, story, pick a plan tease.
 */
export class MorningTalk {
  private panel: Phaser.GameObjects.Container | null = null;
  private open = false;

  constructor(scene: Phaser.Scene) {
    if (!bridge().ready()) return;
    const day = bridge().getDay();
    if (day === shownForDay) return;
    shownForDay = day;
    // Day 1 uses the arrow coach; still offer a short chat if day > 1,
    // and a tiny “what next” on day 1 after tutorial ends (coach handles first jobs).
    if (day < 1) return;
    if (day === 1) {
      this.show(
        scene,
        clipWords("Day 1: I stay here and guide you."),
        clipWords("Places are on the left. Tap Home, Plants, or Lab. The picture stays clear."),
        [
          {
            id: "lets_go",
            label: "Guide me",
            hint: "Drag a yellow chip from the left tray onto the Radio glow.",
          },
          {
            id: "skip_coach",
            label: "I know this",
            hint: "Tap a place on the left. Drag me onto the bunk in Home to end the day.",
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
    const { height: H } = scene.scale;
    const panelW = RAIL_W - 16;
    // Stay in the left column so the base picture stays visible while you choose.
    this.panel = scene.add.container(RAIL_W / 2, H * 0.58).setDepth(130).setScrollFactor(0);
    const bg = scene.add
      .rectangle(0, 0, panelW, 250, THEME.panel, 0.98)
      .setStrokeStyle(3, THEME.line, 0.25);
    const g = scene.add
      .text(0, -100, clipWords(goal), {
        fontFamily: THEME.fontDisplay,
        fontSize: "14px",
        color: THEME.ink,
        align: "center",
        wordWrap: { width: panelW - 20 },
      })
      .setOrigin(0.5);
    const s = scene.add
      .text(0, -52, clipWords(story), {
        fontFamily: THEME.font,
        fontSize: "12px",
        color: THEME.inkSoft,
        align: "center",
        wordWrap: { width: panelW - 20 },
      })
      .setOrigin(0.5);
    const pick = scene.add
      .text(0, -8, "Which one do you pick?", {
        fontFamily: THEME.fontDisplay,
        fontSize: "13px",
        color: THEME.ink,
      })
      .setOrigin(0.5);

    this.panel.add([bg, g, s, pick]);

    choices.slice(0, 2).forEach((c, i) => {
      const btn = scene.add
        .text(0, 28 + i * 40, c.label, {
          fontFamily: THEME.fontDisplay,
          fontSize: "13px",
          color: THEME.ink,
          backgroundColor: "#ffe08a",
          padding: { x: 10, y: 6 },
          align: "center",
          wordWrap: { width: panelW - 28 },
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
