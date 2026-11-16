import Phaser from "phaser";
import { audio } from "../../audio/audio";
import { bridge } from "../bridge";
import { isDaylight } from "../../ui/teach/dayNight";
import { plannedPowerCost } from "../../ui/powerMath";
import { applyMovement, makeKeys, type ControlKeys } from "../playerControls";
import {
  addShadow,
  dustPuff,
  floatNumber,
  idleBreathe,
  oxygenBubbles,
  paintMoonGround,
  panelGlow,
  reduceMotion,
  setPlantHealth,
  shieldShimmer,
  sparkBurst,
  stormWarningPulse,
  twinkleStars,
  walkHop,
} from "../anim";
import { DwellCircle, STILL_SPEED } from "../dwellCircle";
import { THEME } from "../theme";
import { createRng } from "../../engine/rng";
import {
  COMMS_COST,
  LOSE_OXYGEN_AT,
  LOSE_WATER_AT,
  SCIENCE_COST_PER_LEVEL,
  SCIENCE_LEVEL_MAX,
  SCIENCE_SUCCESS_TARGET,
  START_OXYGEN,
  START_WATER,
} from "../../engine/constants";

/**
 * Outdoor base: walk into buildings, shelter / science outdoors, bed ends the day.
 * Machines live inside rooms (IndoorScene).
 */
export class BaseWorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys: ControlKeys | null = null;
  private shadowSync!: () => void;
  private walkSync!: () => void;
  private circles: DwellCircle[] = [];
  private dishImg: Phaser.GameObjects.Image | null = null;
  private dishSpin: Phaser.Tweens.Tween | null = null;
  private panelsImg: Phaser.GameObjects.Image | null = null;
  private panelTween: Phaser.Tweens.Tween | null = null;
  private plantLeaves: Phaser.GameObjects.Ellipse[] = [];
  private waterFill: Phaser.GameObjects.Rectangle | null = null;
  private oxyFill: Phaser.GameObjects.Rectangle | null = null;
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;
  private powerHud!: Phaser.GameObjects.Container;
  private powerTitle!: Phaser.GameObjects.Text;
  private powerCells: Phaser.GameObjects.Rectangle[] = [];
  private resourceHud!: Phaser.GameObjects.Text;
  private alertText!: Phaser.GameObjects.Text;
  private alertPulse: Phaser.Tweens.Tween | null = null;
  private novaBubble!: Phaser.GameObjects.Text;
  private lastFootstep = 0;
  private lastDay = -1;
  private ending = false;
  private walkTarget: { x: number; y: number } | null = null;
  private lastOxyOn: boolean | null = null;
  private lastGreenhouse: boolean | null = null;
  private lastHudKey = "";
  private lastComms: boolean | null = null;

  constructor() {
    super("base");
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.ending = false;
    this.lastHudKey = "";
    this.circles = [];
    this.powerCells = [];
    this.dishSpin = null;
    this.panelTween = null;
    this.alertPulse = null;
    this.bubbleTimer = null;

    let night = false;
    try {
      const s = bridge().getState();
      night = !isDaylight(s.site, s.day);
    } catch {
      /* */
    }

    let seed = 42;
    try {
      seed = bridge().getDay() * 7919 + (bridge().getState().site === "rim" ? 3 : 5);
    } catch {
      /* */
    }
    paintMoonGround(this, W, H, night, createRng(seed));

    this.add
      .image(W / 2, H * 0.55, "surface")
      .setDisplaySize(W * 0.92, H * 0.55)
      .setAlpha(0.22)
      .setDepth(1);

    if (!night) {
      this.add.ellipse(W * 0.85, H * 0.1, 90, 90, 0xffe08a, 0.55).setDepth(2);
    } else {
      const rng = createRng(seed);
      const stars: Phaser.GameObjects.Arc[] = [];
      for (let i = 0; i < 16; i++) {
        stars.push(
          this.add.circle(rng() * W, rng() * H * 0.35, 1.2, 0xffffff, 0.8).setDepth(2),
        );
      }
      twinkleStars(this, stars);
    }
    this.add.image(W * 0.08, H * 0.1, "earth").setDisplaySize(64, 64).setDepth(3);

    this.placeDoor("home", "Crew home", W * 0.18, H * 0.4, "habitat", 110, 95);
    this.placeDoor("greenhouse", "Greenhouse", W * 0.48, H * 0.36, "greenhouse", 100, 95);
    this.placeDoor("lab", "Science lab", W * 0.78, H * 0.4, "labCottage", 100, 95);

    this.panelsImg = this.add
      .image(W * 0.32, H * 0.68, "panels")
      .setDisplaySize(90, 54)
      .setDepth(7);
    this.dishImg = this.add
      .image(W * 0.62, H * 0.66, "dish")
      .setDisplaySize(64, 64)
      .setDepth(7);
    this.add.image(W * 0.88, H * 0.7, "rover").setDisplaySize(80, 52).setDepth(7);

    this.buildTanks(W, H);
    this.buildPlants(W, H);
    this.buildHud(W, H);
    this.buildOutdoorCircles(W, H);

    this.player = this.physics.add
      .sprite(W * 0.5, H * 0.72, "nova")
      .setDisplaySize(56, 76)
      .setCollideWorldBounds(true)
      .setDepth(20);
    this.player.body!.setSize(28, 22);
    this.player.body!.setOffset(16, 52);
    this.physics.world.setBounds(20, H * 0.34, W - 40, H * 0.54);

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
      if (this.ending || !bridge().ready()) return;
      this.walkTarget = {
        x: p.worldX,
        y: Phaser.Math.Clamp(p.worldY, H * 0.38, H * 0.88),
      };
    });

    this.time.delayedCall(100, () => this.beginDay());
  }

  private beginDay() {
    if (!bridge().ready()) return;
    this.ending = false;
    this.lastDay = bridge().getDay();
    if (this.lastDay === 1) audio.play("dayStart");
    try {
      const shields = bridge().getState().shieldLevel;
      if (shields > 0) {
        shieldShimmer(this, this.scale.width * 0.18, this.scale.height * 0.4, shields);
      }
    } catch {
      /* */
    }
    this.refreshWorldFx(true);
    this.refreshAlerts();
    this.refreshHud(true);
    for (const c of this.circles) c.refresh();
    this.novaBubble.setText(
      bridge().getNovaLine() ||
        "Walk into a building. Stand on circles to switch machines. Bed ends the day.",
    );
  }

  private placeDoor(
    room: "home" | "greenhouse" | "lab",
    label: string,
    x: number,
    y: number,
    key: string,
    w: number,
    h: number,
  ) {
    this.add.image(x, y, key).setDisplaySize(w, h).setDepth(6);
    this.add
      .text(x, y - h * 0.55, label, {
        fontFamily: THEME.fontDisplay,
        fontSize: "12px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(25);

    const c = new DwellCircle(this, {
      id: `door-${room}`,
      x,
      y: y + h * 0.35,
      label: `Enter ${label}`,
      costBenefit: "Stand still to go inside",
      radius: 32,
      getOn: () => false,
      onComplete: () => {
        audio.play("door");
        sparkBurst(this, x, y);
        this.scene.start("indoor", { room });
      },
    });
    this.circles.push(c);
  }

  private buildTanks(W: number, H: number) {
    const mk = (x: number, label: string, color: number) => {
      this.add
        .rectangle(x, H * 0.52, 26, 64, 0x2a2218, 0.9)
        .setStrokeStyle(2, THEME.line, 0.3)
        .setDepth(8);
      const fill = this.add
        .rectangle(x, H * 0.52 + 28, 20, 56, color, 0.9)
        .setOrigin(0.5, 1)
        .setDepth(9);
      this.add
        .text(x, H * 0.52 - 40, label, {
          fontFamily: THEME.font,
          fontSize: "10px",
          color: THEME.cream,
        })
        .setOrigin(0.5)
        .setDepth(10);
      return fill;
    };
    this.waterFill = mk(W * 0.06, "H₂O", 0x3a7ca5);
    this.oxyFill = mk(W * 0.11, "O₂", 0x2f7d4a);
  }

  private buildPlants(W: number, H: number) {
    this.plantLeaves = [];
    for (let i = 0; i < 3; i++) {
      const x = W * (0.42 + i * 0.05);
      const y = H * 0.48;
      const leaf = this.add.ellipse(x, y, 28, 36, 0x8a6a3a).setDepth(8);
      this.add.rectangle(x, y + 22, 22, 12, 0x6b4a2a).setDepth(8);
      this.plantLeaves.push(leaf);
    }
  }

  private buildHud(W: number, H: number) {
    this.powerHud = this.add.container(12, 10).setDepth(70).setScrollFactor(0);
    this.powerTitle = this.add.text(0, 0, "Day 1/10 · Power", {
      fontFamily: THEME.fontDisplay,
      fontSize: "13px",
      color: THEME.ink,
      backgroundColor: THEME.cream,
      padding: { x: 8, y: 4 },
    });
    this.powerHud.add(this.powerTitle);
    // Cap cells once; tint later (never destroy each frame).
    for (let i = 0; i < 20; i++) {
      const cell = this.add
        .rectangle(8 + i * 18, 28, 14, 22, 0x6a6570, 0.35)
        .setStrokeStyle(1, THEME.line, 0.35)
        .setVisible(false);
      this.powerHud.add(cell);
      this.powerCells.push(cell);
    }

    this.resourceHud = this.add
      .text(12, 48, "", {
        fontFamily: THEME.font,
        fontSize: "12px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 8, y: 5 },
      })
      .setDepth(70)
      .setScrollFactor(0);

    this.alertText = this.add
      .text(W / 2, 10, "", {
        fontFamily: THEME.fontDisplay,
        fontSize: "13px",
        color: "#fff8ef",
        backgroundColor: "#c98b7b",
        padding: { x: 10, y: 5 },
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setDepth(71)
      .setScrollFactor(0)
      .setVisible(false);

    this.novaBubble = this.add
      .text(W / 2, H - 14, "", {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 10, y: 6 },
        align: "center",
        wordWrap: { width: W - 40 },
      })
      .setOrigin(0.5, 1)
      .setDepth(72)
      .setScrollFactor(0);

    this.add
      .text(W - 12, H - 8, "NASA stills · DONKI · OSDR — see About the data", {
        fontFamily: THEME.font,
        fontSize: "9px",
        color: THEME.inkSoft,
      })
      .setOrigin(1, 1)
      .setDepth(70)
      .setScrollFactor(0)
      .setAlpha(0.75);
  }

  private buildOutdoorCircles(W: number, H: number) {
    const add = (
      id: string,
      x: number,
      y: number,
      label: string,
      costBenefit: string,
      getOn: () => boolean,
      onComplete: (wasOn: boolean) => void,
      isAvailable?: () => boolean,
    ) => {
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
    };

    add(
      "science",
      W * 0.78,
      H * 0.72,
      "Science walk",
      `−${SCIENCE_COST_PER_LEVEL} power · +science +risk`,
      () => bridge().getDecisions().scienceLevel > 0,
      (wasOn) => {
        if (!this.canAfford(!wasOn, { scienceLevel: wasOn ? 0 : 1 })) return;
        bridge().patchDecisions({
          scienceLevel: wasOn ? 0 : Math.min(SCIENCE_LEVEL_MAX, 1),
        });
        audio.play(wasOn ? "toggleOff" : "toggleOn");
        if (!wasOn) floatNumber(this, W * 0.78, H * 0.65, "+science", THEME.sageInk);
        sparkBurst(this, W * 0.78, H * 0.68);
        this.afterToggle();
      },
    );

    add(
      "shield",
      W * 0.28,
      H * 0.78,
      "Build shield",
      "−2 materials · less storm risk",
      () => Boolean(bridge().getDecisions().buildShield),
      (wasOn) => {
        if (!wasOn && bridge().getState().materials < 2) {
          bridge().setNovaLine("Need 2 materials to build a shield.");
          this.novaBubble.setText(bridge().getNovaLine());
          return;
        }
        bridge().patchDecisions({ buildShield: !wasOn });
        audio.play(wasOn ? "toggleOff" : "toggleOn");
        if (!wasOn) shieldShimmer(this, W * 0.18, H * 0.4, 1);
        this.afterToggle();
      },
    );

    add(
      "shelter",
      W * 0.18,
      H * 0.72,
      "Shelter",
      "0 power · cuts storm risk · no outdoor science",
      () => bridge().getSheltering(),
      (wasOn) => {
        bridge().setSheltering(!wasOn);
        audio.play(wasOn ? "toggleOff" : "shelterClose");
        bridge().setNovaLine(
          wasOn
            ? "Shelter off — we will stay out if a storm hits."
            : "Shelter ready. Go inside and use the bed when done.",
        );
        this.novaBubble.setText(bridge().getNovaLine());
        this.afterToggle();
      },
      () => bridge().getEvent()?.stormSeverity !== undefined,
    );

    // Quick outdoor radio (also available inside home).
    add(
      "radio",
      W * 0.62,
      H * 0.78,
      "Radio",
      `−${COMMS_COST} power · storm warning next day`,
      () => bridge().getDecisions().comms,
      (wasOn) => this.toggleBool("comms", wasOn, "powerHum"),
    );
  }

  private toggleBool(
    key: "recycler" | "oxygenMaker" | "comms" | "greenhouse" | "cleanFilter",
    wasOn: boolean,
    sfx?: "waterTrickle" | "airHiss" | "powerHum" | "plantSparkle",
  ) {
    if (!this.canAfford(!wasOn, { [key]: !wasOn })) return;
    bridge().patchDecisions({ [key]: !wasOn });
    audio.play(wasOn ? "toggleOff" : "toggleOn");
    if (!wasOn && sfx) audio.play(sfx);
    sparkBurst(this, this.player.x, this.player.y - 24);
    this.afterToggle();
  }

  private canAfford(turningOn: boolean, patch: Record<string, unknown>): boolean {
    if (!turningOn) return true;
    const d = { ...bridge().getDecisions(), ...patch };
    if (plannedPowerCost(d as never) > bridge().getPowerToday()) {
      bridge().setNovaLine("Not enough power cells left for that.");
      this.novaBubble.setText(bridge().getNovaLine());
      audio.play("uiClick");
      return false;
    }
    return true;
  }

  private afterToggle() {
    this.refreshHud(true);
    this.refreshWorldFx(false);
    for (const c of this.circles) c.refresh();
  }

  private refreshHud(force = false) {
    if (!bridge().ready()) return;
    const power = bridge().getPowerToday();
    const spent = plannedPowerCost(bridge().getDecisions());
    const left = Math.max(0, power - spent);
    const s = bridge().getState();
    const key = `${s.day}|${power}|${left}|${s.water}|${s.oxygen}|${s.science}|${s.exposure.toFixed(0)}|${s.materials}`;
    if (!force && key === this.lastHudKey) return;
    this.lastHudKey = key;

    this.powerTitle.setText(`Day ${s.day}/10 · Power`);
    for (let i = 0; i < this.powerCells.length; i++) {
      const cell = this.powerCells[i]!;
      if (i >= power) {
        cell.setVisible(false);
        continue;
      }
      cell.setVisible(true);
      const filled = i < left;
      cell.setFillStyle(filled ? 0xffe08a : 0x6a6570, filled ? 0.95 : 0.35);
    }
    this.resourceHud.setText(
      `💧${s.water}  O₂${s.oxygen}  Science goal: ${s.science} / ${SCIENCE_SUCCESS_TARGET}  ⚠${s.exposure.toFixed(0)}  mats ${s.materials}`,
    );
  }

  private refreshAlerts() {
    if (!bridge().ready()) return;
    const alerts = bridge().getStormAlerts();
    if (alerts.length === 0) {
      this.alertText.setVisible(false);
      this.alertPulse?.stop();
      this.alertPulse = null;
      return;
    }
    this.alertText.setText(alerts.map((a) => a.message).join(" · "));
    this.alertText.setVisible(true);
    if (!this.alertPulse) {
      this.alertPulse = stormWarningPulse(this, this.alertText);
      audio.play("stormAlert");
    }
  }

  private refreshWorldFx(force: boolean) {
    if (!bridge().ready()) return;
    const d = bridge().getDecisions();
    const st = bridge().getState();

    const commsOn = Boolean(d.comms);
    if (force || commsOn !== this.lastComms) {
      this.lastComms = commsOn;
      if (commsOn && !this.dishSpin && this.dishImg) {
        this.dishSpin = this.tweens.add({
          targets: this.dishImg,
          angle: 360,
          duration: reduceMotion() ? 1 : 4000,
          repeat: -1,
        });
        if (reduceMotion()) this.dishSpin.pause();
      } else if (!commsOn && this.dishSpin) {
        this.dishSpin.stop();
        this.dishSpin = null;
        this.dishImg?.setAngle(0);
      }
    }

    if (this.panelsImg && !this.panelTween) {
      this.panelTween = panelGlow(this, this.panelsImg, true);
    }

    const water01 =
      (st.water - LOSE_WATER_AT) / Math.max(1, START_WATER - LOSE_WATER_AT);
    const oxy01 =
      (st.oxygen - LOSE_OXYGEN_AT) / Math.max(1, START_OXYGEN - LOSE_OXYGEN_AT);
    if (this.waterFill) {
      this.waterFill.setDisplaySize(20, Math.max(4, 56 * Phaser.Math.Clamp(water01, 0, 1)));
    }
    if (this.oxyFill) {
      this.oxyFill.setDisplaySize(20, Math.max(4, 56 * Phaser.Math.Clamp(oxy01, 0, 1)));
    }

    const oxyOn = Boolean(d.oxygenMaker);
    if (force || oxyOn !== this.lastOxyOn) {
      this.lastOxyOn = oxyOn;
      this.bubbleTimer?.remove(false);
      this.bubbleTimer = null;
      if (oxyOn && this.oxyFill) {
        this.bubbleTimer = oxygenBubbles(this, this.oxyFill.x, this.oxyFill.y - 36, true);
      }
    }

    const plantsOn = Boolean(d.greenhouse);
    if (force || plantsOn !== this.lastGreenhouse) {
      this.lastGreenhouse = plantsOn;
      for (const leaf of this.plantLeaves) setPlantHealth(leaf, plantsOn);
    }
  }

  update(_t: number, dt: number) {
    if (!this.player?.body || !bridge().ready()) return;

    const day = bridge().getDay();
    if (this.lastDay > 0 && day !== this.lastDay && !this.ending) {
      this.scene.restart();
      return;
    }

    if (this.ending) {
      this.player.setVelocity(0, 0);
      return;
    }

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
    this.refreshWorldFx(false);
    const line = bridge().getNovaLine();
    if (line && this.novaBubble.text !== line) this.novaBubble.setText(line);
  }
}
