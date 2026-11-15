import Phaser from "phaser";
import { bridge } from "../bridge";
import { isDaylight } from "../../ui/teach/dayNight";
import { plannedPowerCost } from "../../ui/powerMath";
import {
  actionJustPressed,
  applyMovement,
  makeKeys,
  type ControlKeys,
} from "../playerControls";
import { addShadow, idleBreathe, paintMoonGround, sparkBurst, walkHop } from "../anim";
import { TradeOffModal } from "../ui/TradeOffModal";
import { ChoiceModal } from "../ui/ChoiceModal";
import { ConsequenceModal } from "../ui/ConsequenceModal";
import { NasaFrame } from "../ui/NasaFrame";
import { THEME } from "../theme";
import { createRng } from "../../engine/rng";

type Zone = {
  id: string;
  kind: "door" | "board" | "prop";
  label: string;
  room?: "home" | "greenhouse" | "lab";
  x: number;
  y: number;
  r: number;
  onUse?: () => void;
};

/**
 * Outdoor Moon base — clean 2D adventure space (Henry-farm style).
 */
export class BaseWorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys: ControlKeys | null = null;
  private zones: Zone[] = [];
  private near: Zone | null = null;
  private pad = { x: 0, y: 0 };
  private prompt!: Phaser.GameObjects.Text;
  private hud!: Phaser.GameObjects.Text;
  private shadowSync!: () => void;
  private walkSync!: () => void;
  private tradeModal!: TradeOffModal;
  private choiceModal!: ChoiceModal;
  private consequenceModal!: ConsequenceModal;
  private nasaFrame!: NasaFrame;
  private lastMode = "";
  private lastDay = -1;
  private alertText!: Phaser.GameObjects.Text;

  constructor() {
    super("base");
  }

  create() {
    const { width: W, height: H } = this.scale;
    let night = false;
    try {
      const s = bridge().getState();
      night = !isDaylight(s.site, s.day);
    } catch {
      /* */
    }

    {
      let seed = 42;
      try {
        seed = bridge().getDay() * 7919 + (bridge().getState().site === "rim" ? 3 : 5);
      } catch {
        /* */
      }
      paintMoonGround(this, W, H, night, createRng(seed));
    }

    // Soft photo wash for texture (not the whole UI)
    this.add
      .image(W / 2, H * 0.55, "surface")
      .setDisplaySize(W * 0.92, H * 0.55)
      .setAlpha(0.28)
      .setDepth(1);

    if (!night) {
      this.add.ellipse(W * 0.85, H * 0.1, 90, 90, 0xffe08a, 0.55).setDepth(2);
    } else {
      // Seed decorative stars from mission day so remounts don't reshuffle.
      let seed = 1;
      try {
        seed = bridge().getDay() * 9973 + (bridge().getState().site === "rim" ? 1 : 2);
      } catch {
        /* */
      }
      const rng = createRng(seed);
      for (let i = 0; i < 20; i++) {
        this.add
          .circle(rng() * W, rng() * H * 0.35, 1.2, 0xffffff, 0.8)
          .setDepth(2);
      }
    }
    this.add.image(W * 0.1, H * 0.12, "earth").setDisplaySize(72, 72).setDepth(3);

    this.zones = [];
    this.placeBuilding("home", "Crew home", W * 0.2, H * 0.48, "habitat", 130, 110);
    this.placeBuilding("greenhouse", "Greenhouse", W * 0.5, H * 0.42, "greenhouse", 120, 110);
    this.placeBuilding("lab", "Science lab", W * 0.78, H * 0.48, "labCottage", 120, 110);

    this.placeProp(W * 0.35, H * 0.7, "panels", 100, 60, "Solar panels");
    this.placeProp(W * 0.62, H * 0.68, "dish", 70, 70, "Earth dish");
    this.placeProp(W * 0.88, H * 0.72, "rover", 90, 58, "Rover");

    this.makeDayBoard(W * 0.5, H * 0.82);
    this.spawnWorkingCrew(W, H);

    this.player = this.physics.add
      .sprite(W * 0.5, H * 0.72, "nova")
      .setDisplaySize(58, 78)
      .setCollideWorldBounds(true)
      .setDepth(20);
    this.player.body!.setSize(28, 22);
    this.player.body!.setOffset(18, 55);
    this.physics.world.setBounds(24, H * 0.36, W - 48, H * 0.52);

    const sh = addShadow(this, this.player);
    this.shadowSync = sh.sync;
    idleBreathe(this, this.player);
    this.walkSync = walkHop(this.player).sync;

    this.keys = makeKeys(this);
    this.buildPad();

    this.hud = this.add
      .text(12, 10, "", {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 10, y: 8 },
      })
      .setDepth(70)
      .setScrollFactor(0);

    this.prompt = this.add
      .text(W / 2, H - 18, "", {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(70)
      .setScrollFactor(0);

    const plan = this.add
      .text(W - 12, 14, "Plan day", {
        fontFamily: THEME.fontDisplay,
        fontSize: "15px",
        color: THEME.ink,
        backgroundColor: "#d9f5e5",
        padding: { x: 12, y: 7 },
      })
      .setOrigin(1, 0)
      .setDepth(70)
      .setInteractive({ useHandCursor: true });
    plan.on("pointerdown", () => this.tradeModal.show());

    this.nasaFrame = new NasaFrame(this, W - 100, H * 0.38);
    this.tradeModal = new TradeOffModal(this);
    this.choiceModal = new ChoiceModal(this);
    this.consequenceModal = new ConsequenceModal(this);

    this.alertText = this.add
      .text(W / 2, 52, "", {
        fontFamily: THEME.fontDisplay,
        fontSize: "14px",
        color: "#fff8ef",
        backgroundColor: "#c98b7b",
        padding: { x: 10, y: 6 },
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setDepth(71)
      .setScrollFactor(0)
      .setVisible(false);

    // Start with trade-off open (teaching first) once bridge is ready
    this.time.delayedCall(200, () => {
      if (!bridge().ready()) return;
      const mode = bridge().getMode();
      if (mode === "power" || mode === "explore") this.tradeModal.show();
      if (mode === "choose") this.choiceModal.show();
      if (mode === "result") this.consequenceModal.show();
      this.refreshAlerts();
    });
  }

  private placeBuilding(
    room: "home" | "greenhouse" | "lab",
    label: string,
    x: number,
    y: number,
    key: string,
    w: number,
    h: number,
  ) {
    const img = this.add.image(x, y, key).setDisplaySize(w, h).setDepth(8);
    this.tweens.add({
      targets: img,
      y: y - 4,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    const tag = this.add
      .text(x, y - h * 0.55, label, {
        fontFamily: THEME.fontDisplay,
        fontSize: "12px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(25);
    const hit = this.add
      .rectangle(x, y, w * 0.9, h * 0.9, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true })
      .setDepth(9);
    hit.on("pointerover", () => img.setTint(0xffe7a8));
    hit.on("pointerout", () => img.clearTint());
    hit.on("pointerdown", () => {
      if (this.tradeModal.isOpen() || this.choiceModal.isOpen()) return;
      sparkBurst(this, x, y - 20);
      this.scene.start("indoor", { room });
    });
    this.zones.push({ id: room, kind: "door", label, room, x, y, r: 70 });
    void tag;
  }

  private placeProp(
    x: number,
    y: number,
    key: string,
    w: number,
    h: number,
    label: string,
  ) {
    const img = this.add.image(x, y, key).setDisplaySize(w, h).setDepth(7);
    this.tweens.add({
      targets: img,
      angle: 3,
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });
    this.zones.push({
      id: key,
      kind: "prop",
      label,
      x,
      y,
      r: 55,
      onUse: () => {
        sparkBurst(this, x, y);
        this.prompt.setText(label);
      },
    });
  }

  private makeDayBoard(x: number, y: number) {
    const board = this.add
      .rectangle(x, y, 170, 46, THEME.accent)
      .setStrokeStyle(3, THEME.line, 0.25)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, "DAY BOARD", {
        fontFamily: THEME.fontDisplay,
        fontSize: "14px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(11);
    this.tweens.add({
      targets: board,
      scale: 1.05,
      duration: 650,
      yoyo: true,
      repeat: -1,
    });
    board.on("pointerdown", () => this.useBoard());
    this.zones.push({ id: "board", kind: "board", label: "Day board", x, y, r: 70 });
  }

  private spawnWorkingCrew(W: number, H: number) {
    const a = this.add.image(W * 0.4, H * 0.6, "girl").setDisplaySize(48, 64).setDepth(12);
    const b = this.add.image(W * 0.6, H * 0.62, "worker").setDisplaySize(48, 64).setDepth(12);
    idleBreathe(this, a);
    idleBreathe(this, b);
    this.tweens.add({
      targets: a,
      x: W * 0.37,
      y: H * 0.66,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    this.tweens.add({
      targets: b,
      x: W * 0.64,
      duration: 1800,
      yoyo: true,
      repeat: -1,
    });
    this.time.addEvent({
      delay: 650,
      loop: true,
      callback: () => sparkBurst(this, a.x + 8, a.y - 18, 0xffe08a),
    });
  }

  private buildPad() {
    const { width: W, height: H } = this.scale;
    const mk = (x: number, y: number, label: string, dx: number, dy: number) => {
      const b = this.add
        .rectangle(x, y, 42, 42, THEME.panel, 0.92)
        .setStrokeStyle(2, THEME.line, 0.2)
        .setScrollFactor(0)
        .setDepth(70)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x, y, label, {
          fontFamily: THEME.fontDisplay,
          fontSize: "16px",
          color: THEME.ink,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(71);
      b.on("pointerdown", () => {
        this.pad.x = dx;
        this.pad.y = dy;
      });
      const clear = () => {
        this.pad.x = 0;
        this.pad.y = 0;
      };
      b.on("pointerup", clear);
      b.on("pointerout", clear);
    };
    const ox = 60;
    const oy = H - 78;
    mk(ox, oy - 44, "↑", 0, -1);
    mk(ox - 44, oy, "←", -1, 0);
    mk(ox, oy, "↓", 0, 1);
    mk(ox + 44, oy, "→", 1, 0);

    const act = this.add
      .circle(W - 58, H - 78, 30, THEME.good, 0.95)
      .setStrokeStyle(3, THEME.line, 0.25)
      .setScrollFactor(0)
      .setDepth(70)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(W - 58, H - 78, "DO", {
        fontFamily: THEME.fontDisplay,
        fontSize: "14px",
        color: THEME.ink,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(71);
    act.on("pointerdown", () => this.tryInteract());
  }

  private refreshHud() {
    try {
      const b = bridge();
      const d = b.getDecisions();
      const spent = plannedPowerCost(d);
      const s = b.getState();
      const lit = isDaylight(s.site, s.day);
      this.hud.setText(
        `Day ${b.getDay()}/10  ${lit ? "☀" : "☾"} ${s.site}\n` +
          `Power ${spent}/${b.getPowerToday()}  💧${s.water}  O₂${s.oxygen}  ⚠${s.exposure}\n` +
          `Cleaner ${d.recycler ? "ON" : "off"} · Air ${d.oxygenMaker ? "ON" : "off"} · Plants ${d.greenhouse ? "ON" : "off"} · Walks ${d.scienceLevel}`,
      );
    } catch {
      /* */
    }
  }

  private refreshAlerts() {
    if (!this.alertText || !bridge().ready()) return;
    const alerts = bridge().getStormAlerts();
    if (alerts.length === 0) {
      this.alertText.setVisible(false);
      return;
    }
    this.alertText.setText(alerts.map((a) => a.message).join(" · "));
    this.alertText.setVisible(true);
  }

  update() {
    if (!this.player?.body) return;
    if (!bridge().ready()) return;

    // React to mode / day changes from the shell (no remount needed)
    const mode = bridge().getMode();
    const day = bridge().getDay();
    // Soft day rollover without destroying the Phaser.Game (repaint sky/ground).
    if (this.lastDay > 0 && day !== this.lastDay && mode === "power") {
      this.lastDay = day;
      this.lastMode = "";
      this.scene.restart();
      return;
    }
    if (day !== this.lastDay) {
      this.lastDay = day;
      this.refreshAlerts();
    }
    if (mode !== this.lastMode) {
      this.lastMode = mode;
      if (mode === "choose") {
        this.tradeModal.hide();
        this.consequenceModal.hide();
        this.choiceModal.show();
      } else if (mode === "power") {
        this.choiceModal.hide();
        this.consequenceModal.hide();
        this.tradeModal.show();
        this.refreshAlerts();
      } else if (mode === "result") {
        this.tradeModal.hide();
        this.choiceModal.hide();
        this.consequenceModal.show();
      }
    }

    if (
      this.tradeModal.isOpen() ||
      this.choiceModal.isOpen() ||
      this.consequenceModal.isOpen()
    ) {
      this.player.setVelocity(0, 0);
      this.refreshHud();
      this.prompt.setText(
        this.consequenceModal.isOpen()
          ? "See what changed · Next day"
          : "Finish the card · or Walk the base",
      );
      return;
    }

    applyMovement(this.player, this.keys, this.pad);
    this.shadowSync?.();
    this.walkSync?.();
    this.refreshHud();
    this.nasaFrame?.refresh();

    this.near = null;
    let best = 999;
    for (const z of this.zones) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, z.x, z.y);
      if (dist < z.r && dist < best) {
        best = dist;
        this.near = z;
      }
    }
    this.prompt.setText(
      this.near
        ? `Click / SPACE — ${this.near.label}`
        : "Click a building · Plan day · arrows to walk",
    );
    if (actionJustPressed(this.keys)) this.tryInteract();
  }

  private tryInteract() {
    if (
      this.tradeModal.isOpen() ||
      this.choiceModal.isOpen() ||
      this.consequenceModal.isOpen()
    ) {
      return;
    }
    if (!this.near) {
      this.tradeModal.show();
      return;
    }
    if (this.near.kind === "door" && this.near.room) {
      sparkBurst(this, this.near.x, this.near.y);
      this.scene.start("indoor", { room: this.near.room });
      return;
    }
    if (this.near.kind === "board") {
      this.useBoard();
      return;
    }
    this.near.onUse?.();
  }

  private useBoard() {
    const b = bridge();
    const spent = plannedPowerCost(b.getDecisions());
    if (spent > b.getPowerToday()) {
      this.tradeModal.show();
      return;
    }
    if (b.getMode() === "choose") {
      this.choiceModal.show();
      return;
    }
    this.tradeModal.show();
  }
}
