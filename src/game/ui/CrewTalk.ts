import Phaser from "phaser";
import { audio } from "../../audio/audio";
import { THEME } from "../theme";
import {
  CREW,
  hasMetCrew,
  markCrewMet,
  type PlaceId,
} from "../crewLines";
import { RAIL_W, worldX, worldY } from "./railLayout";

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
    const c = this.scene.add
      .container(worldX(0.96), worldY(0.08))
      .setDepth(85)
      .setScrollFactor(0);
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
    const panelW = RAIL_W - 16;

    this.panel = this.scene.add
      .container(RAIL_W / 2, this.scene.scale.height * 0.56)
      .setDepth(125)
      .setScrollFactor(0);
    const bg = this.scene.add
      .rectangle(0, 0, panelW, 130, THEME.panel, 0.98)
      .setStrokeStyle(3, THEME.line, 0.2)
      .setInteractive();
    const name = this.scene.add
      .text(0, -48, crew.name, {
        fontFamily: THEME.fontDisplay,
        fontSize: "14px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const body = this.scene.add
      .text(0, -6, crew.lines[0]!, {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.ink,
        align: "center",
        wordWrap: { width: panelW - 20 },
      })
      .setOrigin(0.5);
    const tip = this.scene.add
      .text(0, 48, "tap to continue", {
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
