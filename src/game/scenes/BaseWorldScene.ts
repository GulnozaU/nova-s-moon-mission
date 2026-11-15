import Phaser from "phaser";
import { bridge } from "../bridge";
import { jobRows } from "../jobsHud";
import { isDaylight } from "../../ui/teach/dayNight";
import {
  actionJustPressed,
  applyMovement,
  makeKeys,
  type ControlKeys,
} from "../playerControls";
import { plannedPowerCost } from "../../ui/powerMath";

type Zone = {
  id: string;
  kind: "door" | "prop" | "board";
  label: string;
  room?: "home" | "greenhouse" | "lab";
  x: number;
  y: number;
  w: number;
  h: number;
  onUse?: () => void;
  hit?: Phaser.GameObjects.Zone | Phaser.GameObjects.Rectangle;
};

export class BaseWorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys: ControlKeys | null = null;
  private zones: Zone[] = [];
  private near: Zone | null = null;
  private prompt!: Phaser.GameObjects.Text;
  private jobsBar!: Phaser.GameObjects.Text;
  private novaBubble!: Phaser.GameObjects.Text;
  private siteBanner!: Phaser.GameObjects.Text;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private sunGlow!: Phaser.GameObjects.Ellipse;
  private pad = { x: 0, y: 0 };
  private crew: Phaser.GameObjects.Image[] = [];

  constructor() {
    super("base");
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.cameras.main.setBackgroundColor(0x1a1520);

    this.add.image(W / 2, H / 2, "surface").setDisplaySize(W, H).setAlpha(0.92);
    this.add
      .rectangle(W / 2, H * 0.68, W * 0.94, H * 0.48, 0xc4b59a, 0.18)
      .setStrokeStyle(2, 0x8a7a62, 0.35);

    this.sunGlow = this.add
      .ellipse(W * 0.82, H * 0.12, 160, 160, 0xffe08a, 0.35)
      .setDepth(1);
    this.nightOverlay = this.add
      .rectangle(W / 2, H / 2, W, H, 0x0a1020, 0)
      .setDepth(5)
      .setScrollFactor(0);

    this.add.image(W * 0.12, H * 0.16, "earth").setDisplaySize(100, 100).setDepth(2);

    this.zones = [];
    this.makeDoor("home", "Crew home\n(fix machines)", W * 0.2, H * 0.46, "habitat", 150, 120);
    this.makeDoor(
      "greenhouse",
      "Greenhouse\n(water plants)",
      W * 0.5,
      H * 0.4,
      "greenhouse",
      140,
      120,
    );
    this.makeDoor("lab", "Science lab\n(plan walks)", W * 0.78, H * 0.46, "labCottage", 140, 120);

    this.makeProp("panels", "Solar panels", W * 0.34, H * 0.7, "panels", 120, 70, () =>
      this.say(this.lit() ? "Panels are humming — sunny power!" : "Panels are dim — little power at night."),
    );
    this.makeProp("dish", "Earth dish", W * 0.62, H * 0.68, "dish", 88, 88, () =>
      this.say("Turn on Talk to Earth inside Crew home for better storm warnings."),
    );
    this.makeProp("rover", "Rover", W * 0.88, H * 0.7, "rover", 110, 70, () =>
      this.say("Rover helps science walks. Plan walks in the lab."),
    );

    this.makeBoard(W * 0.5, H * 0.8);
    this.spawnCrew(W, H);

    this.player = this.physics.add
      .sprite(W * 0.5, H * 0.72, "nova")
      .setDisplaySize(64, 84)
      .setCollideWorldBounds(true)
      .setDepth(12);
    this.player.body!.setSize(40, 30);
    this.player.body!.setOffset(12, 50);
    this.physics.world.setBounds(20, H * 0.3, W - 40, H * 0.58);

    this.keys = makeKeys(this);
    this.buildTouchPad();

    this.jobsBar = this.add
      .text(W / 2, 6, "", {
        fontFamily: "Georgia, serif",
        fontSize: "13px",
        color: "#1c2a3a",
        backgroundColor: "#fff8ef",
        padding: { x: 10, y: 6 },
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setDepth(60)
      .setScrollFactor(0);

    this.siteBanner = this.add
      .text(W / 2, 48, "", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#fff8ef",
        backgroundColor: "#1c2a3acc",
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(60)
      .setScrollFactor(0);

    this.novaBubble = this.add
      .text(14, 78, "Click a glowing door to go inside. Jobs list stays on top.", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#1c2a3a",
        backgroundColor: "#fff8ef",
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      })
      .setDepth(60)
      .setScrollFactor(0);

    this.prompt = this.add
      .text(W / 2, H - 20, "", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#1c2a3a",
        backgroundColor: "#ffe8b8",
        padding: { x: 12, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(60)
      .setScrollFactor(0);

    this.applySiteLook();
    this.refreshJobs();
  }

  private lit(): boolean {
    try {
      const s = bridge().getState();
      return isDaylight(s.site, s.day);
    } catch {
      return true;
    }
  }

  private applySiteLook() {
    try {
      const s = bridge().getState();
      const lit = isDaylight(s.site, s.day);
      if (s.site === "rim") {
        this.siteBanner.setText("☀ Rim site — sunny almost every day · steadier power");
        this.sunGlow.setAlpha(0.55).setVisible(true);
        this.nightOverlay.setAlpha(0);
        this.cameras.main.setBackgroundColor(0x2a2218);
      } else if (lit) {
        this.siteBanner.setText("☀ Plain site — daylight now · later days get dark");
        this.sunGlow.setAlpha(0.35).setVisible(true);
        this.nightOverlay.setAlpha(0.15);
      } else {
        this.siteBanner.setText("☾ Plain site — night · little solar power · save chips");
        this.sunGlow.setVisible(false);
        this.nightOverlay.setAlpha(0.55);
        this.cameras.main.setBackgroundColor(0x0a1020);
      }
    } catch {
      /* */
    }
  }

  private spawnCrew(W: number, H: number) {
    this.crew = [];
    const a = this.add.image(W * 0.38, H * 0.58, "girl").setDisplaySize(52, 68).setDepth(9);
    const b = this.add.image(W * 0.58, H * 0.6, "worker").setDisplaySize(52, 68).setDepth(9);
    this.crew.push(a, b);

    // Working motions toward panels / dish
    this.tweens.add({
      targets: a,
      x: W * 0.36,
      y: H * 0.66,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    this.tweens.add({
      targets: b,
      x: W * 0.64,
      angle: 6,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    // Sparks while working
    this.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => {
        const spark = this.add
          .circle(a.x + 10, a.y - 20, 3, 0xfff1a8, 0.9)
          .setDepth(11);
        this.tweens.add({
          targets: spark,
          y: spark.y - 18,
          alpha: 0,
          duration: 400,
          onComplete: () => spark.destroy(),
        });
      },
    });
  }

  private makeDoor(
    room: "home" | "greenhouse" | "lab",
    label: string,
    x: number,
    y: number,
    key: string,
    w: number,
    h: number,
  ) {
    const sprite = this.add.image(x, y, key).setDisplaySize(w, h).setDepth(6);
    const tag = this.add
      .text(x, y - h * 0.55, label, {
        fontFamily: "Georgia, serif",
        fontSize: "12px",
        color: "#1c2a3a",
        backgroundColor: "#ffe8b8",
        padding: { x: 6, y: 3 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({
      targets: tag,
      y: tag.y - 5,
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    const hit = this.add
      .rectangle(x, y, w * 0.85, h * 0.85, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true })
      .setDepth(7);
    hit.on("pointerover", () => sprite.setTint(0xfff0c0));
    hit.on("pointerout", () => sprite.clearTint());
    hit.on("pointerdown", () => {
      this.scene.start("indoor", { room });
    });

    this.zones.push({
      id: room,
      kind: "door",
      label: label.replace("\n", " "),
      room,
      x,
      y,
      w: w * 0.7,
      h: h * 0.7,
      hit,
    });
  }

  private makeProp(
    id: string,
    label: string,
    x: number,
    y: number,
    key: string,
    w: number,
    h: number,
    onUse: () => void,
  ) {
    const sprite = this.add.image(x, y, key).setDisplaySize(w, h).setDepth(6);
    this.tweens.add({
      targets: sprite,
      y: y - 4,
      duration: 1100 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    const hit = this.add
      .rectangle(x, y, w, h, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true })
      .setDepth(7);
    hit.on("pointerdown", onUse);
    this.zones.push({ id, kind: "prop", label, x, y, w, h, onUse, hit });
  }

  private makeBoard(x: number, y: number) {
    const board = this.add
      .rectangle(x, y, 180, 52, 0xf0c14a)
      .setStrokeStyle(3, 0x1c2a3a)
      .setDepth(8)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, "DAY BOARD\n(finish jobs)", {
        fontFamily: "Georgia, serif",
        fontSize: "13px",
        color: "#1c2a3a",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(9);
    this.tweens.add({
      targets: board,
      scale: 1.04,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
    board.on("pointerdown", () => this.useBoard());
    this.zones.push({
      id: "board",
      kind: "board",
      label: "Day board",
      x,
      y,
      w: 180,
      h: 56,
      hit: board,
    });
  }

  private buildTouchPad() {
    const { width: W, height: H } = this.scale;
    const mk = (x: number, y: number, label: string, dx: number, dy: number) => {
      const b = this.add
        .rectangle(x, y, 44, 44, 0x1c2a3a, 0.55)
        .setStrokeStyle(2, 0xfff8ef)
        .setScrollFactor(0)
        .setDepth(70)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x, y, label, { fontSize: "16px", color: "#fff8ef" })
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
    const ox = 64;
    const oy = H - 86;
    mk(ox, oy - 46, "↑", 0, -1);
    mk(ox - 46, oy, "←", -1, 0);
    mk(ox, oy, "↓", 0, 1);
    mk(ox + 46, oy, "→", 1, 0);

    const act = this.add
      .circle(W - 64, H - 86, 34, 0x0b6b4f, 0.8)
      .setStrokeStyle(3, 0xfff8ef)
      .setScrollFactor(0)
      .setDepth(70)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(W - 64, H - 86, "DO", {
        fontSize: "15px",
        color: "#fff8ef",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(71);
    act.on("pointerdown", () => this.tryInteract());
  }

  private say(msg: string) {
    this.novaBubble.setText(msg);
  }

  private refreshJobs() {
    try {
      const b = bridge();
      const d = b.getDecisions();
      const rows = jobRows(d);
      const bits = rows.map((j) => `${j.on ? "☑" : "☐"} ${shortLabel(j.id)}`).join(" · ");
      const spent = plannedPowerCost(d);
      this.jobsBar.setText(
        `TODAY'S JOBS · Day ${b.getDay()}/10 · power ${spent}/${b.getPowerToday()} · ${bits}`,
      );
    } catch {
      /* */
    }
  }

  update() {
    if (!this.player?.body) return;
    applyMovement(this.player, this.keys, this.pad);
    this.applySiteLook();
    this.refreshJobs();

    // Night: crew works slower / dimmer
    const lit = this.lit();
    for (const c of this.crew) c.setAlpha(lit ? 1 : 0.65);

    this.near = null;
    let best = 9999;
    for (const z of this.zones) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, z.x, z.y);
      if (dist < Math.max(z.w, z.h) * 0.7 && dist < best) {
        best = dist;
        this.near = z;
      }
    }

    this.prompt.setText(
      this.near
        ? `Click or SPACE — ${this.near.label}`
        : "Click doors / Day board · or walk with arrows + SPACE",
    );

    if (actionJustPressed(this.keys)) this.tryInteract();
  }

  private tryInteract() {
    if (!this.near) {
      this.say("Click a glowing door, or walk closer and press SPACE / DO.");
      return;
    }
    if (this.near.kind === "door" && this.near.room) {
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
      this.say("Too much power! Go turn something OFF in a room.");
      return;
    }
    const mode = b.getMode();
    if (mode === "explore") {
      b.goPowerCheck();
      this.say("Power checked! Click Day board again when ready for today's choice.");
      return;
    }
    if (mode === "power") {
      b.goChoice();
      this.say("Choice time — pick A or B on the side. They are different trade-offs!");
      return;
    }
    this.say("Finish today's choice on the side panel.");
  }
}

function shortLabel(id: string): string {
  if (id === "heat") return "Heat";
  if (id === "recycler") return "Cleaner";
  if (id === "air") return "Air";
  if (id === "comms") return "Radio";
  if (id === "gh") return "Plants";
  if (id === "sci") return "Walks";
  return id;
}
