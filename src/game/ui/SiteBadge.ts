import Phaser from "phaser";
import { bridge } from "../bridge";
import { siteTodayLine } from "../siteCopy";
import { THEME } from "../theme";
import { RAIL_W } from "./railLayout";

/**
 * Persistent “where we built” strip so rim vs plain stays visible in play.
 */
export class SiteBadge {
  private root: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private line: Phaser.GameObjects.Text;
  private lastKey = "";

  constructor(scene: Phaser.Scene, x = 10, y = 220) {
    this.root = scene.add.container(x, y).setDepth(100).setScrollFactor(0);
    const w = Math.min(232, RAIL_W - 16);
    this.bg = scene.add.rectangle(0, 0, w, 1, 0x000000, 0).setOrigin(0, 0).setVisible(false);
    this.line = scene.add.text(0, 0, "", {
      fontFamily: THEME.font,
      fontSize: "11px",
      color: THEME.inkSoft,
      wordWrap: { width: w },
    });
    this.root.add([this.bg, this.line]);
    this.refresh(true);
  }

  refresh(force = false) {
    if (!bridge().ready()) return;
    const s = bridge().getState();
    const power = bridge().getPowerToday();
    const key = `${s.site}|${s.day}|${power}`;
    if (!force && key === this.lastKey) return;
    this.lastKey = key;
    this.line.setText(siteTodayLine(s.site, s.day, power));
  }
}
