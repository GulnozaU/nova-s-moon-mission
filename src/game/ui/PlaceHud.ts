import Phaser from "phaser";
import { audio } from "../../audio/audio";
import { THEME } from "../theme";
import type { PlaceId } from "../crewLines";

type PlaceBtn = {
  id: PlaceId;
  label: string;
  go: () => void;
};

/**
 * Small place icons — tap to auto-walk / jump Nova to that place.
 * Not HTML buttons; Phaser interactive only.
 */
export class PlaceHud {
  private root: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, places: PlaceBtn[], current: PlaceId) {
    const { width: W } = scene.scale;
    this.root = scene.add.container(W - 12, 10).setDepth(81).setScrollFactor(0);

    let y = 0;
    for (const p of places) {
      const bg = scene.add
        .rectangle(0, y, 112, 30, p.id === current ? THEME.good : THEME.panel, 0.98)
        .setOrigin(1, 0)
        .setStrokeStyle(3, THEME.line, 0.35)
        .setInteractive({ useHandCursor: true });
      const t = scene.add
        .text(-56, y + 15, p.label, {
          fontFamily: THEME.fontDisplay,
          fontSize: "13px",
          color: THEME.ink,
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      bg.on("pointerover", () => {
        bg.setScale(1.04);
        audio.play("uiHover");
      });
      bg.on("pointerout", () => bg.setScale(1));
      bg.on("pointerdown", () => {
        audio.play("uiClick");
        p.go();
      });
      this.root.add([bg, t]);
      y += 32;
    }
  }
}
