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
import { addShadow, idleBreathe, sparkBurst, walkHop } from "../anim";
import { THEME } from "../theme";

type RoomId = "home" | "greenhouse" | "lab";
type Held = "wrench" | "can" | "notebook" | null;

type Spot = {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  use: () => void;
  refresh?: () => void;
  status?: Phaser.GameObjects.Text;
  plantLeaf?: Phaser.GameObjects.Ellipse;
};

const HELD: Record<Exclude<Held, null>, string> = {
  wrench: "🔧",
  can: "💧",
  notebook: "📓",
};

export class IndoorScene extends Phaser.Scene {
  private room: RoomId = "home";
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys: ControlKeys | null = null;
  private spots: Spot[] = [];
  private near: Spot | null = null;
  private held: Held = null;
  private heldIcon!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private bubble!: Phaser.GameObjects.Text;
  private pad = { x: 0, y: 0 };
  private shadowSync!: () => void;
  private walkSync!: () => void;
  private plants: Spot[] = [];

  constructor() {
    super("indoor");
  }

  init(data: { room: RoomId }) {
    this.room = data.room ?? "home";
    this.held = null;
    this.plants = [];
  }

  create() {
    const { width: W, height: H } = this.scale;
    // Stylized 2D room — photo as soft wallpaper only
    const bgKey =
      this.room === "home" ? "bunks" : this.room === "greenhouse" ? "greenhouseIn" : "labIn";
    this.cameras.main.setBackgroundColor(0x1a1410);
    this.add.rectangle(0, 0, W, H, 0x2a2218).setOrigin(0).setDepth(0);
    this.add.image(W / 2, H / 2, bgKey).setDisplaySize(W, H).setAlpha(0.32).setDepth(1);
    // Floor strip
    this.add.rectangle(W / 2, H * 0.78, W, H * 0.4, 0x3a3228, 0.65).setDepth(2);

    this.spots = [];
    if (this.room === "home") this.buildHome(W, H);
    if (this.room === "greenhouse") this.buildGreenhouse(W, H);
    if (this.room === "lab") this.buildLab(W, H);
    this.addSpot("exit", "Leave →", W * 0.5, H * 0.9, 0x5a3a1a, () =>
      this.scene.start("base"),
    );

    this.player = this.physics.add
      .sprite(W * 0.5, H * 0.75, "nova")
      .setDisplaySize(62, 82)
      .setCollideWorldBounds(true)
      .setDepth(20);
    this.player.body!.setSize(28, 22);
    this.player.body!.setOffset(16, 55);
    this.physics.world.setBounds(30, H * 0.42, W - 60, H * 0.48);

    const sh = addShadow(this, this.player);
    this.shadowSync = sh.sync;
    idleBreathe(this, this.player);
    this.walkSync = walkHop(this.player).sync;

    this.keys = makeKeys(this);
    this.buildPad();

    this.add
      .text(W / 2, 12, roomTitle(this.room), {
        fontFamily: THEME.fontDisplay,
        fontSize: "20px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5, 0)
      .setDepth(60);

    this.bubble = this.add
      .text(14, 48, intro(this.room), {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 8, y: 6 },
        wordWrap: { width: 300 },
      })
      .setDepth(60);

    this.prompt = this.add
      .text(W / 2, H - 16, "Click a glowing prop · grab shows on Nova", {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(60);

    this.heldIcon = this.add
      .text(0, 0, "", { fontSize: "28px" })
      .setDepth(30)
      .setVisible(false);

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.held) return;
      this.heldIcon.setVisible(true);
      this.heldIcon.setText(HELD[this.held]);
      this.heldIcon.setPosition(p.worldX + 16, p.worldY - 16);
    });

    this.refreshVisuals();
  }

  private buildHome(W: number, H: number) {
    this.addSpot("bunk", "Beds (rest)", W * 0.78, H * 0.5, 0x6b5a4a, () =>
      this.say("Beds are for sleep and storm shelter — not the air maker."),
    );
    this.addSpot("wrench", "Grab wrench", W * 0.14, H * 0.7, THEME.accent, () => {
      this.setHeld("wrench");
      this.say("Wrench ready! Click a machine.");
      sparkBurst(this, this.player.x, this.player.y - 20);
    });
    this.addSpot(
      "recycler",
      "Water cleaner",
      W * 0.34,
      H * 0.56,
      0x3a7ca5,
      () => {
        if (!this.need("wrench")) return;
        const d = bridge().getDecisions();
        bridge().patchDecisions({ recycler: !d.recycler });
        this.setHeld(null);
        sparkBurst(this, W * 0.34, H * 0.56, 0x7ec8ff);
        this.say(
          !d.recycler
            ? `Cleaner ON ↑ save water ↓ −${RECYCLER_COST} power`
            : "Cleaner OFF ↑ save power ↓ more water used",
        );
        this.refreshVisuals();
      },
      (s) => s.status?.setText(bridge().getDecisions().recycler ? "ON" : "off"),
    );
    this.addSpot(
      "air",
      "Air maker",
      W * 0.52,
      H * 0.54,
      0x2f7d4a,
      () => {
        if (!this.need("wrench")) return;
        const d = bridge().getDecisions();
        bridge().patchDecisions({ oxygenMaker: !d.oxygenMaker });
        this.setHeld(null);
        sparkBurst(this, W * 0.52, H * 0.54, 0x6dffa0);
        this.say(
          !d.oxygenMaker
            ? `Air ON ↑ +O₂ ↓ −${OXYGEN_MAKER_COST} power −1💧`
            : "Air OFF",
        );
        this.refreshVisuals();
      },
      (s) => s.status?.setText(bridge().getDecisions().oxygenMaker ? "ON" : "off"),
    );
    this.addSpot(
      "radio",
      "Talk to Earth",
      W * 0.22,
      H * 0.48,
      0x5a4a8a,
      () => {
        if (!this.need("wrench")) return;
        const d = bridge().getDecisions();
        bridge().patchDecisions({ comms: !d.comms });
        this.setHeld(null);
        sparkBurst(this, W * 0.22, H * 0.48);
        this.say(
          !d.comms
            ? `Radio ON ↑ warnings ↓ −${COMMS_COST} power`
            : "Radio OFF",
        );
        this.refreshVisuals();
      },
      (s) => s.status?.setText(bridge().getDecisions().comms ? "ON" : "off"),
    );
  }

  private buildGreenhouse(W: number, H: number) {
    this.addSpot("can", "Grab can", W * 0.14, H * 0.68, 0x3a7ca5, () => {
      this.setHeld("can");
      this.say("Watering can! Click plant trays.");
      sparkBurst(this, this.player.x, this.player.y - 20, 0x7ec8ff);
    });
    for (let i = 0; i < 3; i++) {
      const x = W * (0.4 + i * 0.16);
      const y = H * 0.52;
      const leaf = this.add.ellipse(x, y, 36, 44, 0x3a9a4a).setStrokeStyle(2, 0x1c2a3a).setDepth(8);
      this.add.rectangle(x, y + 28, 28, 16, 0x6b4a2a).setDepth(8);
      const spot = this.addSpot("plant" + i, "Plant", x, y, 0x2f7d4a, () => this.waterPlants(W, H), undefined, true);
      spot.plantLeaf = leaf;
      this.plants.push(spot);
      this.tweens.add({
        targets: leaf,
        scaleY: 1.06,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    }
    this.addSpot("plants", "Add water", W * 0.55, H * 0.62, 0x2f7d4a, () =>
      this.waterPlants(W, H),
    );
  }

  private waterPlants(W: number, H: number) {
    const d = bridge().getDecisions();
    if (!d.greenhouse && this.held !== "can") {
      this.say("Grab the watering can first!");
      return;
    }
    const next = !d.greenhouse;
    bridge().patchDecisions({ greenhouse: next });
    this.setHeld(null);
    if (next) {
      sparkBurst(this, W * 0.55, H * 0.5, 0x7ec8ff);
      this.say(`Watered! ↑ O₂ ↓ −${GREENHOUSE_COST} power −2💧`);
    } else {
      this.say("Stopped. Leaves will dry.");
    }
    this.refreshVisuals();
  }

  private buildLab(W: number, H: number) {
    this.addSpot("notebook", "Grab notebook", W * 0.16, H * 0.6, THEME.accent, () => {
      this.setHeld("notebook");
      this.say("Notebook ready! Click the bench.");
    });
    this.addSpot(
      "bench",
      "Plan walk",
      W * 0.5,
      H * 0.54,
      0x4a6a8a,
      () => {
        const d = bridge().getDecisions();
        if (d.scienceLevel === 0 && this.held !== "notebook") {
          this.say("Grab the notebook first.");
          return;
        }
        const next = Math.min(SCIENCE_LEVEL_MAX, d.scienceLevel + 1);
        bridge().patchDecisions({ scienceLevel: next });
        this.setHeld(null);
        sparkBurst(this, W * 0.5, H * 0.54, 0x7ec8ff);
        this.say(`Walk ×${next} ↑ science ↓ −${SCIENCE_COST_PER_LEVEL} power + risk`);
        this.refreshVisuals();
      },
      (s) => {
        const n = bridge().getDecisions().scienceLevel;
        s.status?.setText(n ? `×${n}` : "off");
      },
    );
    this.addSpot("undo", "Undo walk", W * 0.75, H * 0.58, 0x8a5a3a, () => {
      const d = bridge().getDecisions();
      bridge().patchDecisions({ scienceLevel: Math.max(0, d.scienceLevel - 1) });
      this.refreshVisuals();
    });
  }

  private addSpot(
    id: string,
    label: string,
    x: number,
    y: number,
    color: number,
    use: () => void,
    refresh?: (s: Spot) => void,
    skipVisual = false,
  ): Spot {
    const root = this.add.container(x, y).setDepth(15);
    if (!skipVisual) {
      const glow = this.add.circle(0, 0, 42, THEME.accent, 0.22);
      const body = this.add
        .rectangle(0, 0, 100, 72, color, 0.95)
        .setStrokeStyle(3, THEME.line, 0.2);
      const t = this.add
        .text(0, 8, label, {
          fontFamily: THEME.fontDisplay,
          fontSize: "12px",
          color: THEME.cream,
          align: "center",
          wordWrap: { width: 90 },
        })
        .setOrigin(0.5);
      const status = this.add
        .text(0, 28, "", {
          fontFamily: THEME.font,
          fontSize: "11px",
          color: THEME.cream,
        })
        .setOrigin(0.5);
      root.add([glow, body, t, status]);
      this.tweens.add({
        targets: glow,
        alpha: 0.4,
        scale: 1.1,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
      body.setInteractive({ useHandCursor: true });
      body.on("pointerdown", () => use());
      const spot: Spot = {
        id,
        label,
        x,
        y,
        r: 60,
        use,
        status,
        refresh: refresh ? () => refresh(spot) : undefined,
      };
      this.spots.push(spot);
      return spot;
    }
    const spot: Spot = { id, label, x, y, r: 50, use };
    this.spots.push(spot);
    return spot;
  }

  private setHeld(h: Held) {
    this.held = h;
    if (!h) {
      this.heldIcon.setVisible(false);
      return;
    }
    this.heldIcon.setVisible(true);
    this.heldIcon.setText(HELD[h]);
    this.heldIcon.setPosition(this.player.x + 28, this.player.y - 28);
  }

  private need(h: Held) {
    if (this.held === h) return true;
    this.say(h === "wrench" ? "Click Grab wrench first!" : "Grab the tool first!");
    return false;
  }

  private say(msg: string) {
    this.bubble.setText(msg);
  }

  private refreshVisuals() {
    try {
      for (const s of this.spots) s.refresh?.();
      const on = Boolean(bridge().getDecisions().greenhouse);
      for (const p of this.plants) {
        if (!p.plantLeaf) continue;
        p.plantLeaf.setFillStyle(on ? 0x3a9a4a : 0x8a6a3a);
        p.plantLeaf.setScale(1, on ? 1 : 0.65);
        p.plantLeaf.setAngle(on ? 0 : -14);
      }
    } catch {
      /* */
    }
  }

  private buildPad() {
    const { height: H } = this.scale;
    const mk = (x: number, y: number, label: string, dx: number, dy: number) => {
      const b = this.add
        .rectangle(x, y, 40, 40, THEME.panel, 0.95)
        .setStrokeStyle(2, THEME.line, 0.2)
        .setDepth(70)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x, y, label, {
          fontFamily: THEME.fontDisplay,
          fontSize: "15px",
          color: THEME.ink,
        })
        .setOrigin(0.5)
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
    const ox = 56;
    const oy = H - 72;
    mk(ox, oy - 42, "↑", 0, -1);
    mk(ox - 42, oy, "←", -1, 0);
    mk(ox, oy, "↓", 0, 1);
    mk(ox + 42, oy, "→", 1, 0);
  }

  update() {
    if (!this.player?.body) return;
    applyMovement(this.player, this.keys, this.pad);
    this.shadowSync?.();
    this.walkSync?.();
    this.refreshVisuals();

    if (this.held) {
      this.heldIcon.setVisible(true);
      this.heldIcon.setText(HELD[this.held]);
      if (!this.input.activePointer.isDown) {
        this.heldIcon.setPosition(this.player.x + 28, this.player.y - 36);
      }
    }

    this.near = null;
    let best = 999;
    for (const s of this.spots) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y);
      if (dist < s.r && dist < best) {
        best = dist;
        this.near = s;
      }
    }
    this.prompt.setText(
      this.held
        ? `Holding ${HELD[this.held]} — click the target`
        : this.near
          ? `Click / SPACE — ${this.near.label}`
          : "Click glowing props · arrows to walk",
    );
    if (actionJustPressed(this.keys) && this.near) this.near.use();
  }
}

function roomTitle(room: RoomId) {
  if (room === "home") return "Crew home";
  if (room === "greenhouse") return "Greenhouse";
  return "Science lab";
}

function intro(room: RoomId) {
  if (room === "greenhouse") return "Grab can → click plants. Brown = dry, green = watered.";
  if (room === "lab") return "Grab notebook → click bench to plan walks.";
  return "Beds ≠ machines. Grab wrench → click cleaner / air / radio.";
}
