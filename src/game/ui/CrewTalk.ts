import Phaser from "phaser";
import { audio } from "../../audio/audio";
import { THEME } from "../theme";
import {
  CREW,
  hasMetCrew,
  markCrewMet,
  type PlaceId,
} from "../crewLines";

/**
 * First-visit crew lines with tap-to-continue, plus a ? replay button.
 */
export class CrewTalk {
  private scene: Phaser.Scene;
  private place: PlaceId;
  private panel: Phaser.GameObjects.Container | null = null;
  private lineIndex = 0;
  private open = false;
  constructor(scene: Phaser.Scene, place: PlaceId) {
    this.scene = scene;
    this.place = place;
    this.makeHelpButton();
    scene.time.delayedCall(200, () => {
      if (!hasMetCrew(place)) this.show();
    });
  }

  private makeHelpButton() {
    const { width: W } = this.scene.scale;
    const c = this.scene.add.container(W - 28, this.scene.scale.height - 56).setDepth(85).setScrollFactor(0);
    const bg = this.scene.add
      .circle(0, 0, 16, THEME.accent, 0.95)
      .setStrokeStyle(2, THEME.line, 0.25)
      .setInteractive({ useHandCursor: true });
    const t = this.scene.add
      .text(0, 0, "?", {
        fontFamily: THEME.fontDisplay,
        fontSize: "16px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    bg.on("pointerdown", () => {
      audio.play("uiClick");
      this.show(true);
    });
    c.add([bg, t]);
    return c;
  }

  show(replay = false) {
    if (this.open) this.hide();
    const crew = CREW[this.place];
    this.lineIndex = 0;
    this.open = true;
    const { width: W, height: H } = this.scene.scale;

    this.panel = this.scene.add.container(W / 2, H - 100).setDepth(90).setScrollFactor(0);
    const bg = this.scene.add
      .rectangle(0, 0, Math.min(520, W - 40), 88, THEME.panel, 0.98)
      .setStrokeStyle(3, THEME.line, 0.2)
      .setInteractive();
    const name = this.scene.add
      .text(-240, -30, crew.name, {
        fontFamily: THEME.fontDisplay,
        fontSize: "14px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    const body = this.scene.add
      .text(0, 2, crew.lines[0]!, {
        fontFamily: THEME.font,
        fontSize: "14px",
        color: THEME.ink,
        align: "center",
        wordWrap: { width: 480 },
      })
      .setOrigin(0.5);
    const tip = this.scene.add
      .text(0, 32, "tap to continue", {
        fontFamily: THEME.font,
        fontSize: "11px",
        color: THEME.inkSoft,
      })
      .setOrigin(0.5);

    bg.on("pointerdown", () => {
      audio.play("uiClick");
      this.lineIndex += 1;
      if (this.lineIndex >= crew.lines.length) {
        if (!replay) markCrewMet(this.place);
        this.hide();
        return;
      }
      body.setText(crew.lines[this.lineIndex]!);
      tip.setText(
        this.lineIndex >= crew.lines.length - 1 ? "tap to close" : "tap to continue",
      );
    });

    this.panel.add([bg, name, body, tip]);
  }

  hide() {
    this.panel?.destroy(true);
    this.panel = null;
    this.open = false;
  }

  isOpen() {
    return this.open;
  }
}
