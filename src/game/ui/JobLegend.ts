import Phaser from "phaser";
import { THEME } from "../theme";
import { RAIL_W } from "./railLayout";

/** Job names and costs — kept in the side column, not on the painting. */
export class JobLegend {
  private body: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, y = 280) {
    scene.add
      .text(12, y, "Jobs", {
        fontFamily: THEME.fontDisplay,
        fontSize: "13px",
        color: THEME.ink,
      })
      .setDepth(100)
      .setScrollFactor(0);
    this.body = scene.add
      .text(12, y + 18, "", {
        fontFamily: THEME.font,
        fontSize: "12px",
        color: THEME.ink,
        wordWrap: { width: RAIL_W - 28 },
        lineSpacing: 3,
      })
      .setDepth(100)
      .setScrollFactor(0);
  }

  show(lines: string[]) {
    this.body.setText(lines.join("\n"));
  }
}
