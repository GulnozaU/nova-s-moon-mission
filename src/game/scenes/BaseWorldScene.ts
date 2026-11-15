import Phaser from "phaser";
import { bridge } from "../bridge";
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
  sprite?: Phaser.GameObjects.Image;
  marker: Phaser.GameObjects.Container;
  onUse?: () => void;
};

export class BaseWorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys: ControlKeys | null = null;
  private zones: Zone[] = [];
  private near: Zone | null = null;
  private prompt!: Phaser.GameObjects.Text;
  private hud!: Phaser.GameObjects.Text;
  private novaBubble!: Phaser.GameObjects.Text;
  private pad = { x: 0, y: 0 };

  constructor() {
    super("base");
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.cameras.main.setBackgroundColor(0x1a1520);

    const bg = this.add.image(W / 2, H / 2, "surface").setDisplaySize(W, H);
    bg.setAlpha(0.95);

    // Soft ground walk area
    this.add
      .rectangle(W / 2, H * 0.62, W * 0.92, H * 0.55, 0xc4b59a, 0.22)
      .setStrokeStyle(2, 0x8a7a62, 0.4);

    this.add.image(W * 0.12, H * 0.18, "earth").setDisplaySize(110, 110).setAlpha(0.9);

    this.zones = [];
    this.makeDoor("home", "Crew home", W * 0.22, H * 0.48, "habitat", 150, 120);
    this.makeDoor("greenhouse", "Greenhouse", W * 0.5, H * 0.42, "greenhouse", 140, 120);
    this.makeDoor("lab", "Science lab", W * 0.78, H * 0.48, "labCottage", 140, 120);

    this.makeProp("panels", "Solar panels", W * 0.35, H * 0.72, "panels", 120, 70, () =>
      this.say("Panels catch sunlight and make power chips for the base."),
    );
    this.makeProp("dish", "Earth radio", W * 0.65, H * 0.7, "dish", 90, 90, () =>
      this.say("This dish talks to Earth. Turn it on inside crew home."),
    );
    this.makeProp("rover", "Rover", W * 0.88, H * 0.72, "rover", 110, 70, () =>
      this.say("The rover helps science walks outside."),
    );

    this.makeBoard(W * 0.5, H * 0.78);

    // Crew NPCs bobbing
    this.add.image(W * 0.4, H * 0.58, "girl").setDisplaySize(56, 72);
    this.add.image(W * 0.6, H * 0.6, "worker").setDisplaySize(56, 72);

    this.player = this.physics.add
      .sprite(W * 0.5, H * 0.68, "nova")
      .setDisplaySize(64, 84)
      .setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.body!.setSize(40, 30);
    this.player.body!.setOffset(12, 50);

    this.physics.world.setBounds(20, H * 0.28, W - 40, H * 0.62);

    this.keys = makeKeys(this);
    this.buildTouchPad();

    this.prompt = this.add
      .text(W / 2, H - 28, "", {
        fontFamily: "Georgia, serif",
        fontSize: "16px",
        color: "#1c2a3a",
        backgroundColor: "#fff8ef",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setScrollFactor(0);

    this.hud = this.add
      .text(16, 12, "", {
        fontFamily: "Georgia, serif",
        fontSize: "15px",
        color: "#fff8ef",
        backgroundColor: "#1c2a3acc",
        padding: { x: 10, y: 8 },
      })
      .setDepth(30)
      .setScrollFactor(0);

    this.novaBubble = this.add
      .text(16, 88, "Walk with arrows or WASD.\nStand near a door and press SPACE or E.", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#1c2a3a",
        backgroundColor: "#fff8ef",
        padding: { x: 10, y: 8 },
        wordWrap: { width: 280 },
      })
      .setDepth(30)
      .setScrollFactor(0);

    this.input.keyboard?.on("keydown-ESC", () => {
      /* stay outdoors */
    });

    this.refreshHud();
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
    const sprite = this.add.image(x, y, key).setDisplaySize(w, h);
    const marker = this.makeMarker(x, y - h * 0.55, label);
    this.zones.push({
      id: room,
      kind: "door",
      label,
      room,
      x,
      y,
      w: w * 0.7,
      h: h * 0.7,
      sprite,
      marker,
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
    const sprite = this.add.image(x, y, key).setDisplaySize(w, h);
    const marker = this.makeMarker(x, y - h * 0.55, label);
    this.zones.push({
      id,
      kind: "prop",
      label,
      x,
      y,
      w: w * 0.7,
      h: h * 0.7,
      sprite,
      marker,
      onUse,
    });
  }

  private makeBoard(x: number, y: number) {
    const board = this.add
      .rectangle(x, y, 160, 48, 0xf0c14a)
      .setStrokeStyle(3, 0x1c2a3a);
    this.add
      .text(x, y, "DAY BOARD", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#1c2a3a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const marker = this.makeMarker(x, y - 40, "Finish jobs");
    this.zones.push({
      id: "board",
      kind: "board",
      label: "Day board",
      x,
      y,
      w: 160,
      h: 56,
      marker,
    });
    void board;
  }

  private makeMarker(x: number, y: number, label: string) {
    const c = this.add.container(x, y);
    const t = this.add
      .text(0, 0, label, {
        fontFamily: "Georgia, serif",
        fontSize: "12px",
        color: "#1c2a3a",
        backgroundColor: "#ffe8b8",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5);
    c.add(t);
    this.tweens.add({
      targets: c,
      y: y - 6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    return c;
  }

  private buildTouchPad() {
    const { width: W, height: H } = this.scale;
    const mk = (x: number, y: number, label: string, dx: number, dy: number) => {
      const b = this.add
        .rectangle(x, y, 48, 48, 0x1c2a3a, 0.55)
        .setStrokeStyle(2, 0xfff8ef)
        .setScrollFactor(0)
        .setDepth(40)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x, y, label, { fontSize: "18px", color: "#fff8ef" })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(41);
      b.on("pointerdown", () => {
        this.pad.x = dx;
        this.pad.y = dy;
      });
      b.on("pointerup", () => {
        this.pad.x = 0;
        this.pad.y = 0;
      });
      b.on("pointerout", () => {
        this.pad.x = 0;
        this.pad.y = 0;
      });
    };
    const ox = 70;
    const oy = H - 90;
    mk(ox, oy - 50, "↑", 0, -1);
    mk(ox - 50, oy, "←", -1, 0);
    mk(ox, oy, "↓", 0, 1);
    mk(ox + 50, oy, "→", 1, 0);

    const act = this.add
      .circle(W - 70, H - 90, 36, 0x0b6b4f, 0.75)
      .setStrokeStyle(3, 0xfff8ef)
      .setScrollFactor(0)
      .setDepth(40)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(W - 70, H - 90, "DO", {
        fontFamily: "Georgia, serif",
        fontSize: "16px",
        color: "#fff8ef",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(41);
    act.on("pointerdown", () => this.tryInteract());
  }

  private say(msg: string) {
    this.novaBubble.setText(msg);
  }

  private refreshHud() {
    try {
      const b = bridge();
      const d = b.getDecisions();
      const spent = plannedPowerCost(d);
      const left = b.getPowerToday() - spent;
      this.hud.setText(
        `Day ${b.getDay()}/10   Power plan ${spent}/${b.getPowerToday()} (left ${left})\n` +
          `Water cleaner ${d.recycler ? "ON" : "off"} · Air ${d.oxygenMaker ? "ON" : "off"} · Radio ${d.comms ? "ON" : "off"}\n` +
          `Greenhouse ${d.greenhouse ? "ON" : "off"} · Science walks ${d.scienceLevel}`,
      );
    } catch {
      /* bridge not ready yet */
    }
  }

  update() {
    if (!this.player?.body) return;
    applyMovement(this.player, this.keys, this.pad);
    this.refreshHud();

    this.near = null;
    let best = 9999;
    for (const z of this.zones) {
      const dx = Math.abs(this.player.x - z.x);
      const dy = Math.abs(this.player.y - z.y);
      const dist = Math.hypot(dx, dy);
      if (dist < Math.max(z.w, z.h) * 0.65 && dist < best) {
        best = dist;
        this.near = z;
      }
    }

    if (this.near) {
      this.prompt.setText(`SPACE / E — ${hintFor(this.near)}`);
    } else {
      this.prompt.setText("Walk to a glowing door. Arrow keys or on-screen pad.");
    }

    if (actionJustPressed(this.keys)) this.tryInteract();
  }

  private tryInteract() {
    if (!this.near) {
      this.say("Walk closer to a door, machine, or the yellow Day board.");
      return;
    }
    const z = this.near;
    if (z.kind === "door" && z.room) {
      this.scene.start("indoor", {
        room: z.room,
        spawnFrom: "base",
      });
      return;
    }
    if (z.kind === "board") {
      this.useBoard();
      return;
    }
    z.onUse?.();
  }

  private useBoard() {
    const b = bridge();
    const mode = b.getMode();
    const spent = plannedPowerCost(b.getDecisions());
    if (spent > b.getPowerToday()) {
      this.say("Too much power! Go turn something off inside a room.");
      return;
    }
    if (mode === "explore") {
      b.goPowerCheck();
      this.say("Power check! Walk to the Day board again when ready for today's choice.");
      return;
    }
    if (mode === "power") {
      b.goChoice();
      this.say("A special day event is ready — pick A or B on the side panel.");
      return;
    }
    this.say("Finish today's choice on the side panel first.");
  }
}

function hintFor(z: Zone): string {
  if (z.kind === "door") return `Go inside ${z.label}`;
  if (z.kind === "board") return "Use Day board";
  return `Look at ${z.label}`;
}
