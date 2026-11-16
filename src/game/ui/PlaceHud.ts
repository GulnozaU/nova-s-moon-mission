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
 * Place list in the left rail. Tap to open that room.
 * The painting itself has no "Tap Home" labels.
 */
export class PlaceHud {
  private root: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, places: PlaceBtn[], current: PlaceId) {
    this.root = scene.add.container(10, 8).setDepth(100).setScrollFactor(0);

    const title = scene.add.text(0, 0, "Places", {
      fontFamily: THEME.fontDisplay,
      fontSize: "14px",
      color: THEME.ink,
    });
    this.root.add(title);

    const bw = 112;
    const bh = 44;
    const gap = 6;
    places.forEach((p, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = col * (bw + gap);
      const y = 20 + row * (bh + gap);
      const here = p.id === current;
      const bg = scene.add
        .rectangle(x, y, bw, bh, here ? THEME.good : THEME.panel, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(3, THEME.line, 0.35)
        .setInteractive({ useHandCursor: true });
      const t = scene.add
        .text(x + bw / 2, y + bh / 2, p.label, {
          fontFamily: THEME.fontDisplay,
          fontSize: "15px",
          color: THEME.ink,
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      bg.on("pointerover", () => {
        bg.setScale(1.03);
        audio.play("uiHover");
      });
      bg.on("pointerout", () => bg.setScale(1));
      bg.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
        ptr.event.stopPropagation();
        audio.play("uiClick");
        p.go();
      });
      this.root.add([bg, t]);
    });
  }
}
