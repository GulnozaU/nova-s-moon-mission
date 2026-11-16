import Phaser from "phaser";
import { audio } from "../../audio/audio";
import { bridge } from "../bridge";
import { applyMovement, makeKeys, type ControlKeys } from "../playerControls";
import { plannedPowerCost } from "../../ui/powerMath";
import {
  COMMS_COST,
  GREENHOUSE_COST,
  GREENHOUSE_OXYGEN,
  GREENHOUSE_SCIENCE,
  GREENHOUSE_WATER,
  HEAT_COST,
  OXYGEN_MAKER_COST,
  OXYGEN_MAKER_GAIN,
  RECYCLER_COST,
  SCIENCE_COST_PER_LEVEL,
  SCIENCE_LEVEL_MAX,
  SCIENCE_SUCCESS_TARGET,
  WATER_USE_WITHOUT_RECYCLER,
  WATER_USE_WITH_RECYCLER,
} from "../../engine/constants";
import {
  addShadow,
  dustPuff,
  floatNumber,
  idleBreathe,
  setPlantHealth,
  sparkBurst,
  stormImpactFx,
  walkHop,
} from "../anim";
import { DwellCircle, STILL_SPEED } from "../dwellCircle";
import { THEME } from "../theme";

type RoomId = "home" | "greenhouse" | "lab";

/**
 * Indoor rooms: stand on glowing circles to switch machines.
 * Bed in Crew home ends the day.
 */
export class IndoorScene extends Phaser.Scene {
  private room: RoomId = "home";
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys: ControlKeys | null = null;
  private circles: DwellCircle[] = [];
  private shadowSync!: () => void;
  private walkSync!: () => void;
  private walkTarget: { x: number; y: number } | null = null;
  private lastFootstep = 0;
  private novaBubble!: Phaser.GameObjects.Text;
  private hud!: Phaser.GameObjects.Text;
  private plantLeaves: Phaser.GameObjects.Ellipse[] = [];
  private ending = false;
  private lastHudKey = "";

  constructor() {
    super("indoor");
  }

  init(data: { room: RoomId }) {
    this.room = data.room ?? "home";
    this.ending = false;
    this.circles = [];
    this.plantLeaves = [];
    this.lastHudKey = "";
  }

  create() {
    const { width: W, height: H } = this.scale;
    const bgKey =
      this.room === "home" ? "bunks" : this.room === "greenhouse" ? "greenhouseIn" : "labIn";
    this.cameras.main.setBackgroundColor(0x1a1410);
    this.add.rectangle(0, 0, W, H, 0x2a2218).setOrigin(0).setDepth(0);
    this.add.image(W / 2, H / 2, bgKey).setDisplaySize(W, H).setAlpha(0.32).setDepth(1);
    this.add.rectangle(W / 2, H * 0.78, W, H * 0.4, 0x3a3228, 0.65).setDepth(2);

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

    this.hud = this.add
      .text(12, 48, "", {
        fontFamily: THEME.font,
        fontSize: "12px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 8, y: 5 },
      })
      .setDepth(60);

    this.novaBubble = this.add
      .text(W / 2, H - 14, intro(this.room), {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 10, y: 6 },
        align: "center",
        wordWrap: { width: W - 40 },
      })
      .setOrigin(0.5, 1)
      .setDepth(60);

    if (this.room === "home") this.buildHome(W, H);
    if (this.room === "greenhouse") this.buildGreenhouse(W, H);
    if (this.room === "lab") this.buildLab(W, H);

    this.circles.push(
      new DwellCircle(this, {
        id: "exit",
        x: W * 0.5,
        y: H * 0.9,
        label: "Leave →",
        costBenefit: "Stand still to go outside",
        radius: 34,
        getOn: () => false,
        onComplete: () => {
          audio.play("door");
          this.scene.start("base");
        },
      }),
    );

    this.player = this.physics.add
      .sprite(W * 0.5, H * 0.72, "nova")
      .setDisplaySize(58, 78)
      .setCollideWorldBounds(true)
      .setDepth(20);
    this.player.body!.setSize(28, 22);
    this.player.body!.setOffset(16, 52);
    this.physics.world.setBounds(30, H * 0.42, W - 60, H * 0.48);

    const sh = addShadow(this, this.player);
    this.shadowSync = sh.sync;
    idleBreathe(this, this.player);
    this.walkSync = walkHop(this.player, (x, y) => {
      dustPuff(this, x, y);
      const now = this.time.now;
      if (now - this.lastFootstep > 420) {
        this.lastFootstep = now;
        audio.play("footstep");
      }
    }).sync;

    this.keys = makeKeys(this);
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.ending) return;
      this.walkTarget = {
        x: p.worldX,
        y: Phaser.Math.Clamp(p.worldY, H * 0.45, H * 0.88),
      };
    });

    this.refreshHud(true);
    for (const c of this.circles) c.refresh();
  }

  private buildHome(W: number, H: number) {
    this.addCircle(
      "heat",
      W * 0.2,
      H * 0.55,
      "Heat",
      `−${HEAT_COST} power · keeps crew warm`,
      () => true,
      () => {
        this.say("Heat stays on every day. It always costs power.");
        audio.play("uiClick");
      },
    );
    this.addCircle(
      "recycler",
      W * 0.38,
      H * 0.58,
      "Water cleaner",
      `−${RECYCLER_COST} power · saves ${WATER_USE_WITHOUT_RECYCLER - WATER_USE_WITH_RECYCLER} water`,
      () => bridge().getDecisions().recycler,
      (wasOn) => this.toggle("recycler", wasOn, "waterTrickle"),
    );
    this.addCircle(
      "air",
      W * 0.55,
      H * 0.58,
      "Air maker",
      `−${OXYGEN_MAKER_COST} power · +${OXYGEN_MAKER_GAIN} oxygen`,
      () => bridge().getDecisions().oxygenMaker,
      (wasOn) => this.toggle("oxygenMaker", wasOn, "airHiss"),
    );
    this.addCircle(
      "radio",
      W * 0.72,
      H * 0.55,
      "Radio",
      `−${COMMS_COST} power · storm warning next day`,
      () => bridge().getDecisions().comms,
      (wasOn) => this.toggle("comms", wasOn, "powerHum"),
    );
    this.addCircle(
      "filter",
      W * 0.38,
      H * 0.72,
      "Clean filter",
      "−1 material −1 power · unclog cleaner",
      () => Boolean(bridge().getDecisions().cleanFilter),
      (wasOn) => {
        if (!wasOn && (bridge().getState().recyclerEfficiency ?? 1) >= 1) {
          this.say("Filter is already clean.");
          return;
        }
        this.toggle("cleanFilter", wasOn);
      },
      () =>
        (bridge().getState().recyclerEfficiency ?? 1) < 1 ||
        Boolean(bridge().getDecisions().cleanFilter),
    );
    this.addCircle(
      "bed",
      W * 0.78,
      H * 0.72,
      "Bed — end day",
      "Stand here to finish today",
      () => false,
      () => this.finishDay(),
    );
  }

  private buildGreenhouse(W: number, H: number) {
    for (let i = 0; i < 3; i++) {
      const x = W * (0.35 + i * 0.15);
      const y = H * 0.52;
      const leaf = this.add.ellipse(x, y, 32, 40, 0x8a6a3a).setDepth(8);
      this.add.rectangle(x, y + 24, 24, 14, 0x6b4a2a).setDepth(8);
      this.plantLeaves.push(leaf);
    }
    this.syncPlants();
    this.addCircle(
      "plants",
      W * 0.5,
      H * 0.68,
      "Water plants",
      `−${GREENHOUSE_COST} power −${GREENHOUSE_WATER} water · +${GREENHOUSE_OXYGEN} O₂ +${GREENHOUSE_SCIENCE} science`,
      () => Boolean(bridge().getDecisions().greenhouse),
      (wasOn) => this.toggle("greenhouse", wasOn, "plantSparkle"),
    );
  }

  private buildLab(W: number, H: number) {
    this.addCircle(
      "science",
      W * 0.5,
      H * 0.58,
      "Science walk",
      `−${SCIENCE_COST_PER_LEVEL} power · +science +risk`,
      () => bridge().getDecisions().scienceLevel > 0,
      (wasOn) => {
        if (!this.canAfford(!wasOn, { scienceLevel: wasOn ? 0 : 1 })) return;
        bridge().patchDecisions({
          scienceLevel: wasOn ? 0 : Math.min(SCIENCE_LEVEL_MAX, 1),
        });
        audio.play(wasOn ? "toggleOff" : "toggleOn");
        if (!wasOn) {
          floatNumber(this, W * 0.5, H * 0.5, "+science", THEME.sageInk);
          sparkBurst(this, W * 0.5, H * 0.54, 0x7ec8ff);
        }
        this.afterToggle();
      },
    );
  }

  private addCircle(
    id: string,
    x: number,
    y: number,
    label: string,
    costBenefit: string,
    getOn: () => boolean,
    onComplete: (wasOn: boolean) => void,
    isAvailable?: () => boolean,
  ) {
    this.circles.push(
      new DwellCircle(this, {
        id,
        x,
        y,
        label,
        costBenefit,
        getOn,
        onComplete,
        isAvailable,
      }),
    );
  }

  private toggle(
    key: "recycler" | "oxygenMaker" | "comms" | "greenhouse" | "cleanFilter",
    wasOn: boolean,
    sfx?: "waterTrickle" | "airHiss" | "powerHum" | "plantSparkle",
  ) {
    if (!this.canAfford(!wasOn, { [key]: !wasOn })) return;
    bridge().patchDecisions({ [key]: !wasOn });
    audio.play(wasOn ? "toggleOff" : "toggleOn");
    if (!wasOn && sfx) audio.play(sfx);
    sparkBurst(this, this.player.x, this.player.y - 24);
    if (key === "greenhouse") this.syncPlants();
    this.afterToggle();
    this.say(
      wasOn
        ? `${labelFor(key)} off.`
        : `${labelFor(key)} on.`,
    );
  }

  private canAfford(turningOn: boolean, patch: Record<string, unknown>): boolean {
    if (!turningOn) return true;
    const d = { ...bridge().getDecisions(), ...patch };
    if (plannedPowerCost(d as never) > bridge().getPowerToday()) {
      this.say("Not enough power cells left for that.");
      audio.play("uiClick");
      return false;
    }
    return true;
  }

  private afterToggle() {
    this.refreshHud(true);
    for (const c of this.circles) c.refresh();
  }

  private syncPlants() {
    const on = Boolean(bridge().getDecisions().greenhouse);
    for (const leaf of this.plantLeaves) setPlantHealth(leaf, on);
  }

  private say(msg: string) {
    bridge().setNovaLine(msg);
    this.novaBubble.setText(msg);
  }

  private refreshHud(force = false) {
    if (!bridge().ready()) return;
    const s = bridge().getState();
    const spent = plannedPowerCost(bridge().getDecisions());
    const left = Math.max(0, bridge().getPowerToday() - spent);
    const key = `${s.day}|${left}|${s.science}|${spent}`;
    if (!force && key === this.lastHudKey) return;
    this.lastHudKey = key;
    this.hud.setText(
      `Power left ${left} · Science goal: ${s.science} / ${SCIENCE_SUCCESS_TARGET}`,
    );
  }

  private finishDay() {
    if (this.ending || !bridge().ready()) return;
    this.ending = true;
    this.walkTarget = null;
    this.player.setVelocity(0, 0);
    audio.play("door");

    const event = bridge().getEvent();
    const isStorm = event?.stormSeverity !== undefined;
    if (isStorm) {
      audio.play("stormHit");
      stormImpactFx(this);
      this.say(
        bridge().getSheltering()
          ? "We sheltered. Safer — but no outdoor science today."
          : "We stayed out in the storm. Risk went up.",
      );
      if (bridge().getSheltering()) audio.play("shelterClose");
    }

    this.time.delayedCall(isStorm ? 700 : 200, () => {
      const deltas = bridge().endDay();
      audio.play("dayEnd");
      const { width: W, height: H } = this.scale;
      deltas.slice(0, 4).forEach((d, i) => {
        const delta = d.after - d.before;
        if (delta === 0) return;
        const sign = delta > 0 ? "+" : "";
        floatNumber(
          this,
          W * (0.3 + i * 0.15),
          H * 0.45,
          `${sign}${Number.isInteger(delta) ? delta : delta.toFixed(1)} ${d.label}`,
          delta >= 0 ? THEME.sageInk : THEME.rose,
        );
        audio.play(delta > 0 ? "resourceUp" : "resourceDown");
      });
      // Return outside for the next day (or end screen hides Phaser).
      this.time.delayedCall(900, () => {
        if (bridge().getMode() === "ending") return;
        this.scene.start("base");
      });
    });
  }

  update(_t: number, dt: number) {
    if (!this.player?.body || !bridge().ready()) return;
    if (this.ending) {
      this.player.setVelocity(0, 0);
      return;
    }

    // If day advanced while indoors, go outside (fresh outdoor day).
    // (endDay already schedules return; this is a safety net.)

    let pad = { x: 0, y: 0 };
    if (this.walkTarget) {
      const dx = this.walkTarget.x - this.player.x;
      const dy = this.walkTarget.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 12) this.walkTarget = null;
      else pad = { x: dx / dist, y: dy / dist };
    }
    if (this.keys) {
      const k = this.keys;
      if (
        k.cursors.left.isDown ||
        k.cursors.right.isDown ||
        k.cursors.up.isDown ||
        k.cursors.down.isDown ||
        k.wasd.left.isDown ||
        k.wasd.right.isDown ||
        k.wasd.up.isDown ||
        k.wasd.down.isDown
      ) {
        this.walkTarget = null;
        pad = { x: 0, y: 0 };
      }
    }
    applyMovement(this.player, this.keys, pad);
    this.shadowSync?.();
    this.walkSync?.();

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const still = Math.hypot(body.velocity.x, body.velocity.y) < STILL_SPEED;
    for (const c of this.circles) {
      c.update(c.contains(this.player.x, this.player.y) && still, dt);
    }
    this.refreshHud(false);
  }
}

function roomTitle(room: RoomId) {
  if (room === "home") return "Crew home";
  if (room === "greenhouse") return "Greenhouse";
  return "Science lab";
}

function intro(room: RoomId) {
  if (room === "greenhouse") {
    return "Stand on Water plants. Green leaves = on.";
  }
  if (room === "lab") return "Stand on Science walk to plan outdoor research.";
  return "Stand on machines to switch them. Bed ends the day.";
}

function labelFor(key: string) {
  if (key === "recycler") return "Water cleaner";
  if (key === "oxygenMaker") return "Air maker";
  if (key === "comms") return "Radio";
  if (key === "greenhouse") return "Plants";
  if (key === "cleanFilter") return "Filter clean";
  return key;
}
