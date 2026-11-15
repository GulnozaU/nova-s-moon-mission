import Phaser from "phaser";
import { bridge } from "../bridge";
import { plainTalk } from "../../content/banned";
import { nasaImageForContext } from "../../content/imageForContext";
import { THEME } from "../theme";

/** Soft 2D A/B trade-off popup with matching NASA still. */
export class ChoiceModal {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private open = false;
  private title!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private btnA!: Phaser.GameObjects.Container;
  private btnB!: Phaser.GameObjects.Container;
  private labelA!: Phaser.GameObjects.Text;
  private labelB!: Phaser.GameObjects.Text;
  private photo!: Phaser.GameObjects.Image;
  private photoCap!: Phaser.GameObjects.Text;
  private picked: "A" | "B" | null = null;
  private confirmBtn!: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width: W, height: H } = scene.scale;
    this.root = scene.add.container(W / 2, H / 2).setDepth(95).setVisible(false);

    const dim = scene.add.rectangle(0, 0, W * 2, H * 2, 0x3a3348, 0.45);
    const panel = scene.add
      .rectangle(0, 0, Math.min(560, W - 32), Math.min(440, H - 32), THEME.panel)
      .setStrokeStyle(3, THEME.line, 0.2);

    this.title = scene.add
      .text(0, -188, "Today's choice", {
        fontFamily: THEME.fontDisplay,
        fontSize: "22px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.photo = scene.add.image(-170, -120, "nasa_title").setDisplaySize(120, 80);
    this.photoCap = scene.add
      .text(-170, -72, "", {
        fontFamily: THEME.font,
        fontSize: "9px",
        color: THEME.inkSoft,
        align: "center",
        wordWrap: { width: 120 },
      })
      .setOrigin(0.5);

    this.body = scene.add
      .text(70, -120, "", {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.ink,
        wordWrap: { width: 280 },
      })
      .setOrigin(0.5);

    this.root.add([dim, panel, this.title, this.photo, this.photoCap, this.body]);

    this.btnA = this.optionBtn(0, -10, () => this.pick("A"));
    this.btnB = this.optionBtn(0, 75, () => this.pick("B"));
    this.labelA = this.btnA.getData("label") as Phaser.GameObjects.Text;
    this.labelB = this.btnB.getData("label") as Phaser.GameObjects.Text;
    this.root.add([this.btnA, this.btnB]);

    this.confirmBtn = this.actionBtn(0, 155, "Do this!", () => {
      if (!this.picked) return;
      bridge().choose(this.picked);
      this.hide();
    }, THEME.good);
    this.confirmBtn.setAlpha(0.45);
    this.root.add(this.confirmBtn);

    this.root.add(
      this.actionBtn(0, 195, "Back to jobs", () => {
        this.hide();
        bridge().goPowerCheck();
      }, THEME.panelAlt),
    );
  }

  private optionBtn(x: number, y: number, fn: () => void) {
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add
      .rectangle(0, 0, 480, 68, THEME.panelAlt)
      .setStrokeStyle(2, THEME.line, 0.15)
      .setInteractive({ useHandCursor: true });
    const label = this.scene.add
      .text(0, 0, "", {
        fontFamily: THEME.font,
        fontSize: "12px",
        color: THEME.ink,
        align: "center",
        wordWrap: { width: 450 },
      })
      .setOrigin(0.5);
    bg.on("pointerdown", fn);
    c.add([bg, label]);
    c.setData("label", label);
    c.setData("bg", bg);
    return c;
  }

  private actionBtn(x: number, y: number, text: string, fn: () => void, fill: number) {
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add
      .rectangle(0, 0, 200, 32, fill)
      .setStrokeStyle(2, THEME.line, 0.2)
      .setInteractive({ useHandCursor: true });
    const t = this.scene.add
      .text(0, 0, text, {
        fontFamily: THEME.fontDisplay,
        fontSize: "14px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    bg.on("pointerdown", fn);
    c.add([bg, t]);
    return c;
  }

  private pick(which: "A" | "B") {
    this.picked = which;
    const bgA = this.btnA.getData("bg") as Phaser.GameObjects.Rectangle;
    const bgB = this.btnB.getData("bg") as Phaser.GameObjects.Rectangle;
    bgA.setStrokeStyle(3, which === "A" ? THEME.accent : THEME.line, which === "A" ? 1 : 0.15);
    bgB.setStrokeStyle(3, which === "B" ? THEME.accent : THEME.line, which === "B" ? 1 : 0.15);
    this.confirmBtn.setAlpha(1);
  }

  show() {
    this.open = true;
    this.picked = null;
    this.confirmBtn.setAlpha(0.45);
    const event = bridge().getEvent();
    if (!event) {
      this.hide();
      return;
    }
    this.title.setText(event.title);
    this.body.setText(
      `${plainTalk(event.explanation)}\n\nA and B are different — read ↑ and ↓.`,
    );
    this.labelA.setText(
      `A · ${event.optionA.label}\n↑ ${plainTalk(event.optionA.benefit)}\n↓ ${plainTalk(event.optionA.cost)}`,
    );
    this.labelB.setText(
      `B · ${event.optionB.label}\n↑ ${plainTalk(event.optionB.benefit)}\n↓ ${plainTalk(event.optionB.cost)}`,
    );

    try {
      const img = nasaImageForContext(event.id, bridge().getDay());
      const key = `nasa_${img.slot}`;
      if (this.scene.textures.exists(key)) {
        this.photo.setTexture(key).setDisplaySize(120, 80);
      }
      this.photoCap.setText(img.credit.replace("Image: ", ""));
    } catch {
      /* */
    }

    this.root.setVisible(true);
  }

  hide() {
    this.open = false;
    this.root.setVisible(false);
  }

  isOpen() {
    return this.open;
  }
}
