import Phaser from "phaser";
import { PHASER_ART } from "../artKeys";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.add.rectangle(w / 2, h / 2, 240, 18, 0x3a2f24).setOrigin(0.5);
    const fill = this.add.rectangle(w / 2 - 118, h / 2, 4, 14, 0xf0c14a).setOrigin(0, 0.5);
    this.add
      .text(w / 2, h / 2 - 36, "Loading Moon base…", {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        color: "#fff8ef",
      })
      .setOrigin(0.5);

    this.load.on("progress", (p: number) => {
      fill.width = 4 + 232 * p;
    });

    for (const [key, url] of Object.entries(PHASER_ART)) {
      this.load.image(key, url);
    }
  }

  create() {
    this.scene.start("base");
  }
}
