import Phaser from "phaser";
import { bridge } from "../bridge";
import { siteTodayLine } from "../siteCopy";
import { isDaylight } from "../../ui/teach/dayNight";
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

  constructor(scene: Phaser.Scene, x = 10, y = 124) {
    this.root = scene.add.container(x, y).setDepth(100).setScrollFactor(0);
    const w = Math.min(232, RAIL_W - 16);
    this.bg = scene.add
      .rectangle(0, 0, w, 40, THEME.panel, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(2, THEME.line, 0.35);
    this.line = scene.add.text(6, 4, "", {
      fontFamily: THEME.font,
      fontSize: "11px",
      color: THEME.ink,
      wordWrap: { width: w - 12 },
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
    const night = !isDaylight(s.site, s.day);
    this.bg.setFillStyle(night ? 0xd9e2f0 : 0xfff3c4, 0.96);
    this.line.setText(siteTodayLine(s.site, s.day, power));
  }
}
