import Phaser from "phaser";
import { bridge } from "../bridge";
import {
  actionJustPressed,
  applyMovement,
  makeKeys,
  type ControlKeys,
} from "../playerControls";
import {
  COMMS_COST,
  GREENHOUSE_COST,
  OXYGEN_MAKER_COST,
  RECYCLER_COST,
  SCIENCE_COST_PER_LEVEL,
  SCIENCE_LEVEL_MAX,
} from "../../engine/constants";

type RoomId = "home" | "greenhouse" | "lab";
type Held = "wrench" | "can" | "notebook" | null;

type Spot = {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  marker: Phaser.GameObjects.Container;
  use: () => void;
};

type InitData = { room: RoomId };

export class IndoorScene extends Phaser.Scene {
  private room: RoomId = "home";
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys: ControlKeys | null = null;
  private spots: Spot[] = [];
  private near: Spot | null = null;
  private held: Held = null;
  private prompt!: Phaser.GameObjects.Text;
  private bubble!: Phaser.GameObjects.Text;
  private hud!: Phaser.GameObjects.Text;
  private pad = { x: 0, y: 0 };

  constructor() {
    super("indoor");
  }

  init(data: InitData) {
    this.room = data.room ?? "home";
    this.held = null;
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.cameras.main.setBackgroundColor(0x2a241c);

    const bgKey =
      this.room === "home"
        ? "bunks"
        : this.room === "greenhouse"
          ? "greenhouseIn"
          : "labIn";
    this.add.image(W / 2, H / 2, bgKey).setDisplaySize(W, H).setAlpha(0.9);

    // Walkable floor tint
    this.add.rectangle(W / 2, H * 0.7, W, H * 0.55, 0x000000, 0.15);

    this.spots = [];
    if (this.room === "home") this.buildHome(W, H);
    if (this.room === "greenhouse") this.buildGreenhouse(W, H);
    if (this.room === "lab") this.buildLab(W, H);

    this.addExit(W * 0.5, H * 0.88);

    this.player = this.physics.add
      .sprite(W * 0.5, H * 0.75, "nova")
      .setDisplaySize(70, 92)
      .setCollideWorldBounds(true)
      .setDepth(10);
    this.player.body!.setSize(40, 30);
    this.player.body!.setOffset(12, 55);
    this.physics.world.setBounds(40, H * 0.35, W - 80, H * 0.55);

    this.keys = makeKeys(this);
    this.buildTouchPad();

    const title =
      this.room === "home"
        ? "Crew home"
        : this.room === "greenhouse"
          ? "Greenhouse"
          : "Science lab";

    this.add
      .text(W / 2, 18, title, {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: "#1c2a3a",
        backgroundColor: "#fff8ef",
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(30);

    this.hud = this.add
      .text(16, 48, "", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#fff8ef",
        backgroundColor: "#1c2a3acc",
        padding: { x: 8, y: 6 },
      })
      .setDepth(30);

    this.bubble = this.add
      .text(16, 100, intro(this.room), {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#1c2a3a",
        backgroundColor: "#fff8ef",
        padding: { x: 10, y: 8 },
        wordWrap: { width: 300 },
      })
      .setDepth(30);

    this.prompt = this.add
      .text(W / 2, H - 24, "", {
        fontFamily: "Georgia, serif",
        fontSize: "15px",
        color: "#1c2a3a",
        backgroundColor: "#ffe8b8",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(30);

    this.refreshHud();
  }

  private buildHome(W: number, H: number) {
    this.spot("wrench", "Grab wrench", W * 0.18, H * 0.62, () => {
      this.held = "wrench";
      this.say("Wrench ready! Walk to a machine and press SPACE.");
    });
    this.spot("recycler", "Water cleaner", W * 0.4, H * 0.55, () => {
      if (!this.requireHeld("wrench", "Grab the wrench first.")) return;
      const d = bridge().getDecisions();
      const next = !d.recycler;
      bridge().patchDecisions({ recycler: next });
      this.held = null;
      this.say(
        next
          ? `Water cleaner ON! Uses ${RECYCLER_COST} power. Crew drinks less water.`
          : "Water cleaner off.",
      );
    });
    this.spot("air", "Air maker", W * 0.62, H * 0.52, () => {
      if (!this.requireHeld("wrench", "Grab the wrench first.")) return;
      const d = bridge().getDecisions();
      const next = !d.oxygenMaker;
      bridge().patchDecisions({ oxygenMaker: next });
      this.held = null;
      this.say(
        next
          ? `Air maker ON! +oxygen. Costs ${OXYGEN_MAKER_COST} power and 1 water.`
          : "Air maker off.",
      );
    });
    this.spot("radio", "Talk to Earth", W * 0.82, H * 0.48, () => {
      if (!this.requireHeld("wrench", "Grab the wrench first.")) return;
      const d = bridge().getDecisions();
      const next = !d.comms;
      bridge().patchDecisions({ comms: next });
      this.held = null;
      this.say(
        next
          ? `Radio ON! Better storm warnings. Uses ${COMMS_COST} power.`
          : "Radio off.",
      );
    });
    this.spot("bunk", "Crew bunks", W * 0.5, H * 0.42, () => {
      this.say("We sleep here. When storms are big, we shelter here to stay safe.");
    });
  }

  private buildGreenhouse(W: number, H: number) {
    this.spot("can", "Grab watering can", W * 0.2, H * 0.65, () => {
      this.held = "can";
      this.say("Watering can ready! Walk to the plants and press SPACE.");
    });
    this.spot("plants", "Add water", W * 0.55, H * 0.55, () => {
      const d = bridge().getDecisions();
      if (!d.greenhouse && this.held !== "can") {
        this.say("Grab the watering can first, then water the plants.");
        return;
      }
      const next = !d.greenhouse;
      bridge().patchDecisions({ greenhouse: next });
      this.held = null;
      if (next) {
        this.splash(W * 0.55, H * 0.5);
        this.say(
          `Splash! Greenhouse ON. Uses ${GREENHOUSE_COST} power + 2 water, makes a little oxygen.`,
        );
      } else {
        this.say("Greenhouse off. Plants wait.");
      }
    });
    this.spot("leaves", "Check leaves", W * 0.78, H * 0.48, () => {
      this.say("Green leaves make oxygen for us to breathe — but plants are thirsty!");
    });
  }

  private buildLab(W: number, H: number) {
    this.spot("notebook", "Grab notebook", W * 0.22, H * 0.58, () => {
      this.held = "notebook";
      this.say("Notebook ready! Walk to the work bench and press SPACE.");
    });
    this.spot("bench", "Plan science walk", W * 0.55, H * 0.52, () => {
      const d = bridge().getDecisions();
      if (d.scienceLevel === 0 && this.held !== "notebook") {
        this.say("Grab the notebook first.");
        return;
      }
      const next = Math.min(SCIENCE_LEVEL_MAX, d.scienceLevel + 1);
      bridge().patchDecisions({ scienceLevel: next });
      this.held = null;
      this.say(
        `Science walk level ${next}! Each uses ${SCIENCE_COST_PER_LEVEL} power + a little risk.`,
      );
    });
    this.spot("undo", "Cancel one walk", W * 0.8, H * 0.58, () => {
      const d = bridge().getDecisions();
      const next = Math.max(0, d.scienceLevel - 1);
      bridge().patchDecisions({ scienceLevel: next });
      this.say(next === 0 ? "No walks today." : `Now ${next} walk(s).`);
    });
    this.spot("chart", "Storm chart", W * 0.4, H * 0.4, () => {
      this.say("This chart shows storms from the Sun. Big storms mean shelter!");
    });
  }

  private addExit(x: number, y: number) {
    this.spot("exit", "Leave room", x, y, () => {
      this.scene.start("base");
    });
  }

  private spot(id: string, label: string, x: number, y: number, use: () => void) {
    const marker = this.add.container(x, y - 28);
    const ring = this.add.circle(0, 28, 18, 0xf0c14a, 0.35).setStrokeStyle(2, 0xf0c14a);
    const t = this.add
      .text(0, 0, label, {
        fontFamily: "Georgia, serif",
        fontSize: "12px",
        color: "#1c2a3a",
        backgroundColor: "#fff8ef",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5);
    marker.add([ring, t]);
    this.tweens.add({
      targets: ring,
      scale: 1.15,
      alpha: 0.55,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
    this.spots.push({ id, label, x, y, r: 55, marker, use });
  }

  private requireHeld(need: Held, msg: string): boolean {
    if (this.held === need) return true;
    this.say(msg);
    return false;
  }

  private say(msg: string) {
    this.bubble.setText(msg);
  }

  private splash(x: number, y: number) {
    const c = this.add.circle(x, y, 10, 0x7ec8ff, 0.8).setDepth(20);
    this.tweens.add({
      targets: c,
      scale: 6,
      alpha: 0,
      duration: 700,
      onComplete: () => c.destroy(),
    });
  }

  private buildTouchPad() {
    const { width: W, height: H } = this.scale;
    const mk = (x: number, y: number, label: string, dx: number, dy: number) => {
      const b = this.add
        .rectangle(x, y, 48, 48, 0x1c2a3a, 0.55)
        .setStrokeStyle(2, 0xfff8ef)
        .setDepth(40)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x, y, label, { fontSize: "18px", color: "#fff8ef" })
        .setOrigin(0.5)
        .setDepth(41);
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
    const ox = 70;
    const oy = H - 90;
    mk(ox, oy - 50, "↑", 0, -1);
    mk(ox - 50, oy, "←", -1, 0);
    mk(ox, oy, "↓", 0, 1);
    mk(ox + 50, oy, "→", 1, 0);

    const act = this.add
      .circle(W - 70, H - 90, 36, 0x0b6b4f, 0.75)
      .setStrokeStyle(3, 0xfff8ef)
      .setDepth(40)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(W - 70, H - 90, "DO", {
        fontSize: "16px",
        color: "#fff8ef",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(41);
    act.on("pointerdown", () => this.near?.use());
  }

  private refreshHud() {
    try {
      const d = bridge().getDecisions();
      const hold =
        this.held === "wrench"
          ? "🔧 wrench"
          : this.held === "can"
            ? "💧 can"
            : this.held === "notebook"
              ? "📓 notebook"
              : "nothing";
      this.hud.setText(
        `Holding: ${hold}\nCleaner ${d.recycler ? "ON" : "off"} · Air ${d.oxygenMaker ? "ON" : "off"} · Radio ${d.comms ? "ON" : "off"}\nPlants ${d.greenhouse ? "ON" : "off"} · Walks ${d.scienceLevel}`,
      );
    } catch {
      /* ignore */
    }
  }

  update() {
    if (!this.player?.body) return;
    applyMovement(this.player, this.keys, this.pad);
    this.refreshHud();

    this.near = null;
    let best = 9999;
    for (const s of this.spots) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y);
      if (dist < s.r && dist < best) {
        best = dist;
        this.near = s;
      }
    }
    this.prompt.setText(
      this.near
        ? `SPACE / E — ${this.near.label}`
        : "Walk to a glowing spot. Grab a tool, then use it.",
    );

    if (actionJustPressed(this.keys) && this.near) this.near.use();
  }
}

function intro(room: RoomId): string {
  if (room === "greenhouse") {
    return "Grab the watering can, walk to the plants, press SPACE to add water.";
  }
  if (room === "lab") {
    return "Grab the notebook, walk to the bench, press SPACE to plan a science walk.";
  }
  return "Grab the wrench, walk to a machine, press SPACE to turn it on or off.";
}
