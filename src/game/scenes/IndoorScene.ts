import Phaser from "phaser";
import { bridge } from "../bridge";
import { jobRows } from "../jobsHud";
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
  root: Phaser.GameObjects.Container;
  status?: Phaser.GameObjects.Text;
  icon?: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  plant?: Phaser.GameObjects.Container;
  use: () => void;
  refresh?: () => void;
};

type InitData = { room: RoomId };

const HELD_LABEL: Record<Exclude<Held, null>, string> = {
  wrench: "🔧 Wrench",
  can: "💧 Watering can",
  notebook: "📓 Notebook",
};

export class IndoorScene extends Phaser.Scene {
  private room: RoomId = "home";
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys: ControlKeys | null = null;
  private spots: Spot[] = [];
  private near: Spot | null = null;
  private held: Held = null;
  private heldFollow!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private bubble!: Phaser.GameObjects.Text;
  private jobsBar!: Phaser.GameObjects.Text;
  private pad = { x: 0, y: 0 };
  private plants: Phaser.GameObjects.Container[] = [];

  constructor() {
    super("indoor");
  }

  init(data: InitData) {
    this.room = data.room ?? "home";
    this.held = null;
    this.plants = [];
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.cameras.main.setBackgroundColor(0x1b1612);

    const bgKey =
      this.room === "home"
        ? "bunks"
        : this.room === "greenhouse"
          ? "greenhouseIn"
          : "labIn";
    // Dim photo backdrop — real game props sit in front
    this.add.image(W / 2, H / 2, bgKey).setDisplaySize(W, H).setAlpha(0.35);
    this.add.rectangle(W / 2, H * 0.72, W, H * 0.5, 0x3a3228, 0.55);

    this.spots = [];
    if (this.room === "home") this.buildHome(W, H);
    if (this.room === "greenhouse") this.buildGreenhouse(W, H);
    if (this.room === "lab") this.buildLab(W, H);
    this.addExit(W * 0.5, H * 0.9);

    this.player = this.physics.add
      .sprite(W * 0.5, H * 0.78, "nova")
      .setDisplaySize(68, 90)
      .setCollideWorldBounds(true)
      .setDepth(12);
    this.player.body!.setSize(36, 28);
    this.player.body!.setOffset(14, 56);
    this.physics.world.setBounds(30, H * 0.4, W - 60, H * 0.5);

    this.keys = makeKeys(this);
    this.buildTouchPad();

    this.jobsBar = this.add
      .text(W / 2, 8, "", {
        fontFamily: "Georgia, serif",
        fontSize: "13px",
        color: "#1c2a3a",
        backgroundColor: "#fff8ef",
        padding: { x: 10, y: 6 },
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setDepth(50)
      .setScrollFactor(0);

    this.add
      .text(W / 2, 52, roomTitle(this.room), {
        fontFamily: "Georgia, serif",
        fontSize: "20px",
        color: "#fff8ef",
        backgroundColor: "#1c2a3acc",
        padding: { x: 12, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.bubble = this.add
      .text(14, 78, intro(this.room), {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#1c2a3a",
        backgroundColor: "#fff8ef",
        padding: { x: 10, y: 8 },
        wordWrap: { width: Math.min(320, W * 0.42) },
      })
      .setDepth(50);

    this.prompt = this.add
      .text(W / 2, H - 18, "Click a glowing thing · or walk close + SPACE", {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#1c2a3a",
        backgroundColor: "#ffe8b8",
        padding: { x: 12, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.heldFollow = this.add
      .text(0, 0, "", {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        color: "#1c2a3a",
        backgroundColor: "#f0c14a",
        padding: { x: 8, y: 4 },
      })
      .setDepth(60)
      .setVisible(false);

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.held) {
        this.heldFollow.setVisible(true);
        this.heldFollow.setText(HELD_LABEL[this.held]);
        this.heldFollow.setPosition(p.worldX + 18, p.worldY - 18);
      }
    });

    this.refreshAll();
  }

  private buildHome(W: number, H: number) {
    // Sleeping bunks — LOOK only (not the air maker!)
    this.prop({
      id: "bunk",
      label: "Crew bunks",
      sub: "Rest / shelter",
      x: W * 0.78,
      y: H * 0.48,
      iconKey: "nova",
      color: 0x6b5a4a,
      use: () =>
        this.say("Beds are for sleep. When storms get big, we shelter here."),
    });

    this.prop({
      id: "wrench",
      label: "Grab wrench",
      sub: "Tool",
      x: W * 0.14,
      y: H * 0.7,
      iconKey: "zap",
      color: 0xf0c14a,
      use: () => {
        this.setHeld("wrench");
        this.say("You grabbed the wrench! Click a machine to turn it on/off.");
        this.pulsePlayer();
      },
    });

    this.prop({
      id: "recycler",
      label: "Water cleaner",
      sub: `Uses ${RECYCLER_COST} power`,
      x: W * 0.32,
      y: H * 0.58,
      iconKey: "water",
      color: 0x3a7ca5,
      use: () => {
        if (!this.requireHeld("wrench")) return;
        const d = bridge().getDecisions();
        const next = !d.recycler;
        bridge().patchDecisions({ recycler: next });
        this.setHeld(null);
        this.fx(W * 0.32, H * 0.58, next ? 0x5ec8ff : 0x888888);
        this.say(
          next
            ? `Water cleaner ON ↑ saves water · ↓ ${RECYCLER_COST} power`
            : "Water cleaner OFF ↑ save power · ↓ crew uses more water",
        );
        this.refreshAll();
      },
      refresh: (s) => this.setMachineOn(s, bridge().getDecisions().recycler),
    });

    this.prop({
      id: "air",
      label: "Air maker",
      sub: `Uses ${OXYGEN_MAKER_COST} power + 1💧`,
      x: W * 0.52,
      y: H * 0.56,
      iconKey: "leaf",
      color: 0x2f7d4a,
      use: () => {
        if (!this.requireHeld("wrench")) return;
        const d = bridge().getDecisions();
        const next = !d.oxygenMaker;
        bridge().patchDecisions({ oxygenMaker: next });
        this.setHeld(null);
        this.fx(W * 0.52, H * 0.56, next ? 0x6dffa0 : 0x888888);
        this.say(
          next
            ? `Air maker ON ↑ more oxygen · ↓ ${OXYGEN_MAKER_COST} power + water`
            : "Air maker OFF ↑ save power · ↓ less oxygen made",
        );
        this.refreshAll();
      },
      refresh: (s) => this.setMachineOn(s, bridge().getDecisions().oxygenMaker),
    });

    this.prop({
      id: "radio",
      label: "Talk to Earth",
      sub: `Uses ${COMMS_COST} power`,
      x: W * 0.22,
      y: H * 0.48,
      iconKey: "dish",
      color: 0x5a4a8a,
      use: () => {
        if (!this.requireHeld("wrench")) return;
        const d = bridge().getDecisions();
        const next = !d.comms;
        bridge().patchDecisions({ comms: next });
        this.setHeld(null);
        this.fx(W * 0.22, H * 0.48, next ? 0xa0ff9a : 0x888888);
        this.say(
          next
            ? `Radio ON ↑ better storm warnings · ↓ ${COMMS_COST} power`
            : "Radio OFF ↑ save power · ↓ warnings may be late",
        );
        this.refreshAll();
      },
      refresh: (s) => this.setMachineOn(s, bridge().getDecisions().comms),
    });
  }

  private buildGreenhouse(W: number, H: number) {
    this.prop({
      id: "can",
      label: "Grab watering can",
      sub: "Tool",
      x: W * 0.14,
      y: H * 0.68,
      iconKey: "water",
      color: 0x3a7ca5,
      use: () => {
        this.setHeld("can");
        this.say("Watering can in hand! Click the plant trays to add water.");
        this.pulsePlayer();
      },
    });

    // Living plant props that dry / green based on greenhouse decision
    for (let i = 0; i < 3; i++) {
      const px = W * (0.38 + i * 0.18);
      const py = H * 0.55;
      const plant = this.makePlant(px, py);
      this.plants.push(plant);
    }

    this.prop({
      id: "plants",
      label: "Plant trays",
      sub: "Add water here",
      x: W * 0.55,
      y: H * 0.58,
      iconKey: "leaf",
      color: 0x2f7d4a,
      use: () => {
        const d = bridge().getDecisions();
        if (!d.greenhouse && this.held !== "can") {
          this.say("Grab the watering can first, then click the plants.");
          return;
        }
        const next = !d.greenhouse;
        bridge().patchDecisions({ greenhouse: next });
        this.setHeld(null);
        if (next) {
          this.splash(W * 0.55, H * 0.5);
          this.say(
            `Plants watered! ↑ little oxygen + science · ↓ ${GREENHOUSE_COST} power + 2 water`,
          );
        } else {
          this.say("Stopped watering. ↑ save water · ↓ leaves will dry out.");
        }
        this.refreshAll();
      },
      refresh: () => this.refreshPlants(),
    });

    this.prop({
      id: "leaves",
      label: "Check leaves",
      sub: "Look",
      x: W * 0.82,
      y: H * 0.48,
      iconKey: "leaf",
      color: 0x6b8f3a,
      use: () => {
        const on = bridge().getDecisions().greenhouse;
        this.say(
          on
            ? "Leaves look green and happy — they are making oxygen!"
            : "Leaves look dry and brown — plants need water today.",
        );
      },
    });
  }

  private buildLab(W: number, H: number) {
    this.prop({
      id: "notebook",
      label: "Grab notebook",
      sub: "Tool",
      x: W * 0.16,
      y: H * 0.62,
      iconKey: "zap",
      color: 0xf0c14a,
      use: () => {
        this.setHeld("notebook");
        this.say("Notebook ready! Click the work bench to plan a science walk.");
        this.pulsePlayer();
      },
    });

    this.prop({
      id: "bench",
      label: "Work bench",
      sub: "Plan outside walk",
      x: W * 0.48,
      y: H * 0.55,
      iconKey: "rover",
      color: 0x4a6a8a,
      use: () => {
        const d = bridge().getDecisions();
        if (d.scienceLevel === 0 && this.held !== "notebook") {
          this.say("Grab the notebook first.");
          return;
        }
        const next = Math.min(SCIENCE_LEVEL_MAX, d.scienceLevel + 1);
        bridge().patchDecisions({ scienceLevel: next });
        this.setHeld(null);
        this.fx(W * 0.48, H * 0.55, 0x7ec8ff);
        this.say(
          `Science walk ×${next}! ↑ more science · ↓ ${SCIENCE_COST_PER_LEVEL} power + a little risk outside`,
        );
        this.refreshAll();
      },
      refresh: (s) => {
        const n = bridge().getDecisions().scienceLevel;
        s.status?.setText(n > 0 ? `ON ×${n}` : "off");
        s.status?.setColor(n > 0 ? "#0b6b4f" : "#7a3a2a");
      },
    });

    this.prop({
      id: "undo",
      label: "Cancel one walk",
      sub: "Safer / less science",
      x: W * 0.72,
      y: H * 0.58,
      iconKey: "zap",
      color: 0x8a5a3a,
      use: () => {
        const d = bridge().getDecisions();
        const next = Math.max(0, d.scienceLevel - 1);
        bridge().patchDecisions({ scienceLevel: next });
        this.say(
          next === 0
            ? "No walks. ↑ safer · ↓ less science"
            : `Now ${next} walk(s).`,
        );
        this.refreshAll();
      },
    });

    this.prop({
      id: "chart",
      label: "Storm chart",
      sub: "Look",
      x: W * 0.35,
      y: H * 0.42,
      iconKey: "earth",
      color: 0x8a3a3a,
      use: () =>
        this.say("Storms from the Sun can hurt the crew. Big storm = shelter!"),
    });
  }

  private makePlant(x: number, y: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(8);
    const pot = this.add.rectangle(0, 28, 36, 22, 0x6b4a2a).setStrokeStyle(2, 0x1c2a3a);
    const leaf = this.add.ellipse(0, 0, 40, 48, 0x3a9a4a).setStrokeStyle(2, 0x1c2a3a);
    c.add([pot, leaf]);
    (c as Phaser.GameObjects.Container & { leaf: Phaser.GameObjects.Ellipse }).leaf = leaf;
    this.tweens.add({
      targets: leaf,
      scaleY: 1.06,
      duration: 900 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
    });
    return c;
  }

  private refreshPlants() {
    const on = Boolean(bridge().getDecisions().greenhouse);
    for (const p of this.plants) {
      const leaf = (p as Phaser.GameObjects.Container & { leaf: Phaser.GameObjects.Ellipse }).leaf;
      if (!leaf) continue;
      if (on) {
        leaf.setFillStyle(0x3a9a4a);
        leaf.setScale(1, 1);
        leaf.setAngle(0);
      } else {
        leaf.setFillStyle(0x8a6a3a);
        leaf.setScale(1, 0.7);
        leaf.setAngle(-12);
      }
    }
  }

  private prop(opts: {
    id: string;
    label: string;
    sub: string;
    x: number;
    y: number;
    iconKey: string;
    color: number;
    use: () => void;
    refresh?: (s: Spot) => void;
  }) {
    const root = this.add.container(opts.x, opts.y).setDepth(15);
    const body = this.add
      .rectangle(0, 0, 118, 96, opts.color, 0.92)
      .setStrokeStyle(3, 0xfff8ef);
    const icon = this.add.image(0, -12, opts.iconKey).setDisplaySize(40, 40);
    const label = this.add
      .text(0, 28, opts.label, {
        fontFamily: "Georgia, serif",
        fontSize: "12px",
        color: "#fff8ef",
        align: "center",
        wordWrap: { width: 110 },
      })
      .setOrigin(0.5);
    const status = this.add
      .text(0, 44, opts.sub, {
        fontFamily: "Georgia, serif",
        fontSize: "10px",
        color: "#ffe8b8",
      })
      .setOrigin(0.5);
    const glow = this.add.circle(0, 0, 58, 0xf0c14a, 0.15);
    root.add([glow, body, icon, label, status]);

    this.tweens.add({
      targets: glow,
      alpha: 0.35,
      scale: 1.08,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    body.setInteractive({ useHandCursor: true });
    body.on("pointerover", () => body.setStrokeStyle(3, 0xf0c14a));
    body.on("pointerout", () => body.setStrokeStyle(3, 0xfff8ef));
    body.on("pointerdown", () => {
      opts.use();
    });

    const spot: Spot = {
      id: opts.id,
      label: opts.label,
      x: opts.x,
      y: opts.y,
      r: 70,
      root,
      status,
      icon,
      use: opts.use,
      refresh: opts.refresh ? () => opts.refresh!(spot) : undefined,
    };
    this.spots.push(spot);
  }

  private addExit(x: number, y: number) {
    this.prop({
      id: "exit",
      label: "Leave room",
      sub: "Back outside",
      x,
      y,
      iconKey: "habitat",
      color: 0x4a3a2a,
      use: () => this.scene.start("base"),
    });
  }

  private setMachineOn(s: Spot, on: boolean) {
    s.status?.setText(on ? "ON ✓" : "OFF — click with wrench");
    s.status?.setColor(on ? "#b8ffd0" : "#ffd0b8");
    const body = s.root.list[1] as Phaser.GameObjects.Rectangle | undefined;
    if (body && "setFillStyle" in body) {
      // keep hue, brighten when on
      body.setAlpha(on ? 1 : 0.75);
    }
  }

  private setHeld(h: Held) {
    this.held = h;
    if (!h) {
      this.heldFollow.setVisible(false);
      return;
    }
    this.heldFollow.setVisible(true);
    this.heldFollow.setText(HELD_LABEL[h]);
    this.heldFollow.setPosition(this.player.x + 40, this.player.y - 40);
  }

  private requireHeld(need: Held): boolean {
    if (this.held === need) return true;
    this.say(
      need === "wrench"
        ? "Click the yellow wrench first, then click this machine."
        : need === "can"
          ? "Click the watering can first."
          : "Click the notebook first.",
    );
    return false;
  }

  private say(msg: string) {
    this.bubble.setText(msg);
  }

  private pulsePlayer() {
    this.tweens.add({
      targets: this.player,
      scaleX: this.player.scaleX * 1.08,
      scaleY: this.player.scaleY * 1.08,
      duration: 120,
      yoyo: true,
    });
  }

  private fx(x: number, y: number, color: number) {
    const c = this.add.circle(x, y, 12, color, 0.9).setDepth(40);
    this.tweens.add({
      targets: c,
      scale: 4,
      alpha: 0,
      duration: 450,
      onComplete: () => c.destroy(),
    });
  }

  private splash(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const d = this.add.circle(x, y, 6, 0x7ec8ff, 0.85).setDepth(40);
      this.tweens.add({
        targets: d,
        x: x + (Math.random() - 0.5) * 80,
        y: y + (Math.random() - 0.5) * 60,
        alpha: 0,
        duration: 500,
        onComplete: () => d.destroy(),
      });
    }
  }

  private buildTouchPad() {
    const { height: H } = this.scale;
    const mk = (x: number, y: number, label: string, dx: number, dy: number) => {
      const b = this.add
        .rectangle(x, y, 44, 44, 0x1c2a3a, 0.55)
        .setStrokeStyle(2, 0xfff8ef)
        .setDepth(55)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x, y, label, { fontSize: "16px", color: "#fff8ef" })
        .setOrigin(0.5)
        .setDepth(56);
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
  }

  private refreshAll() {
    try {
      const d = bridge().getDecisions();
      const power = bridge().getPowerToday();
      const rows = jobRows(d);
      const line = rows
        .map((j) => `${j.on ? "☑" : "☐"}${j.label.replace(/\s*\(.*\)/, "")}`)
        .join("  ");
      this.jobsBar.setText(`TODAY'S JOBS (top) · Day ${bridge().getDay()}/10 · ${line}`);
      void power;
      for (const s of this.spots) s.refresh?.();
      this.refreshPlants();
      if (this.held) {
        this.heldFollow.setVisible(true);
        this.heldFollow.setText(HELD_LABEL[this.held]);
        this.heldFollow.setPosition(this.player.x + 36, this.player.y - 36);
      }
    } catch {
      /* bridge */
    }
  }

  update() {
    if (!this.player?.body) return;
    applyMovement(this.player, this.keys, this.pad);
    this.refreshAll();

    this.near = null;
    let best = 9999;
    for (const s of this.spots) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        s.x,
        s.y,
      );
      if (dist < s.r && dist < best) {
        best = dist;
        this.near = s;
      }
    }

    if (this.held) {
      this.prompt.setText(
        `Holding ${HELD_LABEL[this.held]} — click the target (or walk close + SPACE)`,
      );
    } else if (this.near) {
      this.prompt.setText(`Click or SPACE — ${this.near.label}`);
    } else {
      this.prompt.setText("Click a glowing machine/tool · or walk + SPACE");
    }

    if (actionJustPressed(this.keys) && this.near) this.near.use();
  }
}

function roomTitle(room: RoomId): string {
  if (room === "home") return "Crew home — fix machines";
  if (room === "greenhouse") return "Greenhouse — water plants";
  return "Science lab — plan walks";
}

function intro(room: RoomId): string {
  if (room === "greenhouse") {
    return "Click the watering can, then click the plant trays. Dry brown leaves = thirsty.";
  }
  if (room === "lab") {
    return "Click the notebook, then click the work bench. Each walk = more science + more risk.";
  }
  return "Beds are only for rest. Click the wrench, then click Water cleaner / Air maker / Radio.";
}
