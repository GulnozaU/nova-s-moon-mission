import Phaser from "phaser";
import { PHASER_ART, nasaPhaserKeys } from "../artKeys";
import { THEME } from "../theme";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.cameras.main.setBackgroundColor(THEME.skyDeep);
    this.add.rectangle(w / 2, h / 2, 240, 16, THEME.panelAlt).setOrigin(0.5);
    const fill = this.add
      .rectangle(w / 2 - 116, h / 2, 4, 12, THEME.accent)
      .setOrigin(0, 0.5);
    this.add
      .text(w / 2, h / 2 - 36, "Loading Moon base…", {
        fontFamily: THEME.fontDisplay,
        fontSize: "20px",
        color: THEME.cream,
      })
      .setOrigin(0.5);

    this.load.on("progress", (p: number) => {
      fill.width = 4 + 228 * p;
    });

    for (const [key, url] of Object.entries(PHASER_ART)) {
      this.load.image(key, url);
    }
    for (const [key, url] of Object.entries(nasaPhaserKeys())) {
      this.load.image(key, url);
    }
  }

  create() {
    this.scene.start("base");
  }
}
