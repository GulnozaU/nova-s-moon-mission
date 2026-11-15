import Phaser from "phaser";
import { bridge } from "../bridge";
import { plannedPowerCost } from "../../ui/powerMath";
import {
  COMMS_COST,
  GREENHOUSE_COST,
  HEAT_COST,
  OXYGEN_MAKER_COST,
  RECYCLER_COST,
  SCIENCE_COST_PER_LEVEL,
  SCIENCE_LEVEL_MAX,
} from "../../engine/constants";
import type { DayDecisions } from "../../engine/types";
import { THEME } from "../theme";

type Job = {
  key: keyof DayDecisions | "heat";
  title: string;
  help: string;
  cost: string;
  forced?: boolean;
};

const JOBS: Job[] = [
  {
    key: "heat",
    title: "Heat",
    help: "Crew stays warm",
    cost: `−${HEAT_COST} always`,
    forced: true,
  },
  {
    key: "recycler",
    title: "Water cleaner",
    help: "Drink less water",
    cost: `−${RECYCLER_COST} power`,
  },
  {
    key: "oxygenMaker",
    title: "Air maker",
    help: "+3 oxygen",
    cost: `−${OXYGEN_MAKER_COST} power −1💧`,
  },
  {
    key: "comms",
    title: "Talk to Earth",
    help: "Full storm warning",
    cost: `−${COMMS_COST} power`,
  },
  {
    key: "greenhouse",
    title: "Water plants",
    help: "+O₂ +science",
    cost: `−${GREENHOUSE_COST} power −2💧`,
  },
];

/** Soft 2D trade-off card (storybook, not pixel). */
export class TradeOffModal {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private budgetText: Phaser.GameObjects.Text;
  private lessonText: Phaser.GameObjects.Text;
  private rows: {
    job: Job;
    onLabel: Phaser.GameObjects.Text;
    bg: Phaser.GameObjects.Rectangle;
  }[] = [];
  private open = false;
  private sciCount!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width: W, height: H } = scene.scale;
    this.root = scene.add.container(W / 2, H / 2).setDepth(90).setVisible(false);

    const dim = scene.add
      .rectangle(0, 0, W * 2, H * 2, 0x3a3348, 0.45)
      .setInteractive();
    const panel = scene.add
      .rectangle(0, 0, Math.min(500, W - 40), Math.min(440, H - 36), THEME.panel)
      .setStrokeStyle(3, THEME.line, 0.2);

    const title = scene.add
      .text(0, -185, "Today's trade-off", {
        fontFamily: THEME.fontDisplay,
        fontSize: "24px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const sub = scene.add
      .text(0, -158, "You cannot run everything. Every ON helps AND costs.", {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.inkSoft,
        align: "center",
        wordWrap: { width: 440 },
      })
      .setOrigin(0.5);

    this.budgetText = scene.add
      .text(0, -132, "", {
        fontFamily: THEME.font,
        fontSize: "14px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.root.add([dim, panel, title, sub, this.budgetText]);

    let y = -100;
    for (const job of JOBS) {
      this.rows.push(this.makeRow(job, y));
      y += 42;
    }

    const sciBg = scene.add
      .rectangle(0, y + 6, 420, 38, THEME.panelAlt)
      .setStrokeStyle(2, THEME.line, 0.15);
    const sciLabel = scene.add
      .text(-160, y + 6, `Science walks (−${SCIENCE_COST_PER_LEVEL} each)`, {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.ink,
      })
      .setOrigin(0, 0.5);
    this.chip(-10, y + 6, "−", () => this.bumpScience(-1));
    this.chip(50, y + 6, "+", () => this.bumpScience(1));
    this.sciCount = scene.add
      .text(20, y + 6, "0", {
        fontFamily: THEME.fontDisplay,
        fontSize: "16px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.root.add([sciBg, sciLabel, this.sciCount]);

    this.lessonText = scene.add
      .text(0, y + 44, "", {
        fontFamily: THEME.font,
        fontSize: "12px",
        color: THEME.inkSoft,
        align: "center",
        wordWrap: { width: 420 },
      })
      .setOrigin(0.5);
    this.root.add(this.lessonText);

    this.root.add(
      this.bigBtn(0, y + 88, "Lock plan → choice", () => {
        const b = bridge();
        if (plannedPowerCost(b.getDecisions()) > b.getPowerToday()) return;
        this.hide();
        b.goChoice();
      }, THEME.good),
    );
    this.root.add(
      this.bigBtn(0, y + 128, "Walk the base", () => this.hide(), THEME.panelAlt),
    );
  }

  private makeRow(job: Job, y: number) {
    const bg = this.scene.add
      .rectangle(0, y, 420, 36, THEME.panelAlt)
      .setStrokeStyle(2, THEME.line, 0.12)
      .setInteractive({ useHandCursor: !job.forced });
    const title = this.scene.add
      .text(-190, y - 5, job.title, {
        fontFamily: THEME.fontDisplay,
        fontSize: "14px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    const detail = this.scene.add
      .text(-190, y + 10, `↑ ${job.help}   ↓ ${job.cost}`, {
        fontFamily: THEME.font,
        fontSize: "11px",
        color: THEME.inkSoft,
      })
      .setOrigin(0, 0.5);
    const onLabel = this.scene.add
      .text(175, y, "off", {
        fontFamily: THEME.font,
        fontSize: "12px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    if (!job.forced) {
      bg.on("pointerdown", () => this.toggle(job.key as keyof DayDecisions));
    }
    this.root.add([bg, title, detail, onLabel]);
    return { job, onLabel, bg };
  }

  private chip(x: number, y: number, label: string, fn: () => void) {
    const r = this.scene.add
      .circle(x, y, 14, THEME.accent)
      .setStrokeStyle(2, THEME.line, 0.2)
      .setInteractive({ useHandCursor: true });
    const t = this.scene.add
      .text(x, y, label, {
        fontFamily: THEME.fontDisplay,
        fontSize: "16px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    r.on("pointerdown", fn);
    this.root.add([r, t]);
  }

  private bigBtn(x: number, y: number, label: string, fn: () => void, fill: number) {
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add
      .rectangle(0, 0, 260, 34, fill)
      .setStrokeStyle(2, THEME.line, 0.2)
      .setInteractive({ useHandCursor: true });
    const t = this.scene.add
      .text(0, 0, label, {
        fontFamily: THEME.fontDisplay,
        fontSize: "15px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    bg.on("pointerdown", fn);
    c.add([bg, t]);
    this.scene.tweens.add({
      targets: c,
      scale: 1.03,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    return c;
  }

  private toggle(key: keyof DayDecisions) {
    const d = bridge().getDecisions();
    if (key === "scienceLevel" || key === "buildShield" || key === "buildPanel") return;
    bridge().patchDecisions({ [key]: !Boolean(d[key]) });
    this.refresh();
  }

  private bumpScience(delta: number) {
    const d = bridge().getDecisions();
    bridge().patchDecisions({
      scienceLevel: Math.min(
        SCIENCE_LEVEL_MAX,
        Math.max(0, d.scienceLevel + delta),
      ),
    });
    this.refresh();
  }

  show() {
    this.open = true;
    this.root.setVisible(true);
    this.refresh();
  }

  hide() {
    this.open = false;
    this.root.setVisible(false);
  }

  isOpen() {
    return this.open;
  }

  refresh() {
    try {
      const b = bridge();
      const d = b.getDecisions();
      const spent = plannedPowerCost(d);
      const left = b.getPowerToday() - spent;
      this.budgetText.setText(
        left < 0
          ? `Using ${spent}/${b.getPowerToday()} — too much! Turn something off`
          : `Using ${spent}/${b.getPowerToday()} · left for battery ${left}`,
      );
      this.budgetText.setColor(left < 0 ? THEME.rose : THEME.sageInk);
      this.sciCount.setText(String(d.scienceLevel));
      for (const row of this.rows) {
        if (row.job.forced) {
          row.onLabel.setText("ON");
          row.bg.setFillStyle(THEME.good, 0.55);
          continue;
        }
        const on = Boolean(d[row.job.key as keyof DayDecisions]);
        row.onLabel.setText(on ? "ON" : "off");
        row.bg.setFillStyle(on ? THEME.good : THEME.panelAlt, on ? 0.55 : 1);
      }
      this.lessonText.setText(
        left < 0
          ? "Trade-off rule: spending on one job starves another."
          : "Power → cleaner → water → oxygen. Science walks add risk.",
      );
    } catch {
      /* */
    }
  }
}
