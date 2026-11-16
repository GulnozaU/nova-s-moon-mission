import Phaser from "phaser";
import { audio } from "../../audio/audio";
import { bridge } from "../bridge";
import { isDaylight } from "../../ui/teach/dayNight";
import { plannedPowerCost } from "../../ui/powerMath";
import {
  applyMovement,
  makeKeys,
  type ControlKeys,
} from "../playerControls";
import {
  addShadow,
  dayNightCrossfade,
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
  stormImpactFx,
  stormWarningPulse,
  twinkleStars,
  walkHop,
  workingLoop,
} from "../anim";
import { DwellCircle, STILL_SPEED } from "../dwellCircle";
import { THEME } from "../theme";
import { createRng } from "../../engine/rng";
import {
  COMMS_COST,
  GREENHOUSE_COST,
  GREENHOUSE_OXYGEN,
  GREENHOUSE_SCIENCE,
  GREENHOUSE_WATER,
  HEAT_COST,
  LOSE_OXYGEN_AT,
  LOSE_WATER_AT,
  OXYGEN_MAKER_COST,
  OXYGEN_MAKER_GAIN,
  RECYCLER_COST,
  SCIENCE_COST_PER_LEVEL,
  SCIENCE_LEVEL_MAX,
  START_OXYGEN,
  START_WATER,
  WATER_USE_WITHOUT_RECYCLER,
  WATER_USE_WITH_RECYCLER,
} from "../../engine/constants";

/**
 * Full day loop (reference-style): walk, dwell on glowing circles, bed ends day.
 * No Plan-day menus or scrolling result pages.
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
    dayNightCrossfade(this, night);

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
      for (let i = 0; i < 20; i++) {
        stars.push(
          this.add.circle(rng() * W, rng() * H * 0.35, 1.2, 0xffffff, 0.8).setDepth(2),
        );
      }
      twinkleStars(this, stars);
    }
    this.add.image(W * 0.08, H * 0.1, "earth").setDisplaySize(64, 64).setDepth(3);

    // Decorative buildings (not click menus — circles do the work).
    this.add.image(W * 0.18, H * 0.4, "habitat").setDisplaySize(110, 95).setDepth(6);
    this.add.image(W * 0.48, H * 0.36, "greenhouse").setDisplaySize(100, 95).setDepth(6);
    this.add.image(W * 0.78, H * 0.4, "labCottage").setDisplaySize(100, 95).setDepth(6);

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
    this.buildCircles(W, H);

    const crewA = this.add.image(W * 0.4, H * 0.58, "girl").setDisplaySize(44, 58).setDepth(12);
    const crewB = this.add.image(W * 0.58, H * 0.6, "worker").setDisplaySize(44, 58).setDepth(12);
    idleBreathe(this, crewA);
    idleBreathe(this, crewB);
    workingLoop(this, crewA);

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
      if (now - this.lastFootstep > 280) {
        this.lastFootstep = now;
        audio.play("footstep");
      }
    }).sync;

    this.keys = makeKeys(this);
    // Tap-to-walk: click empty ground.
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.ending) return;
      if (!bridge().ready()) return;
      this.walkTarget = { x: p.worldX, y: Phaser.Math.Clamp(p.worldY, H * 0.38, H * 0.88) };
    });

    this.time.delayedCall(120, () => this.beginDay());
  }

  private beginDay() {
    if (!bridge().ready()) return;
    this.ending = false;
    this.lastDay = bridge().getDay();
    audio.play("dayStart");
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
    this.refreshHud();
    for (const c of this.circles) c.refresh();
    this.novaBubble.setText(bridge().getNovaLine() || "Stand still on a circle to switch it on.");
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

  private buildCircles(W: number, H: number) {
    this.circles = [];
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
      const c = new DwellCircle(this, {
        id,
        x,
        y,
        label,
        costBenefit,
        getOn,
        onComplete,
        isAvailable,
      });
      this.circles.push(c);
    };

    // Heat is forced — show as always-on info circle (no toggle).
    add(
      "heat",
      W * 0.22,
      H * 0.62,
      "Heat",
      `−${HEAT_COST} power · keeps crew warm`,
      () => true,
      () => {
        bridge().setNovaLine("Heat stays on every day. It always costs power.");
        this.novaBubble.setText(bridge().getNovaLine());
        audio.play("uiClick");
      },
    );

    add(
      "recycler",
      W * 0.34,
      H * 0.78,
      "Water cleaner",
      `−${RECYCLER_COST} power · saves ${WATER_USE_WITHOUT_RECYCLER - WATER_USE_WITH_RECYCLER} water`,
      () => bridge().getDecisions().recycler,
      (wasOn) => this.toggleJob("recycler", wasOn, "waterTrickle"),
    );

    add(
      "air",
      W * 0.48,
      H * 0.78,
      "Air maker",
      `−${OXYGEN_MAKER_COST} power · +${OXYGEN_MAKER_GAIN} oxygen`,
      () => bridge().getDecisions().oxygenMaker,
      (wasOn) => this.toggleJob("oxygenMaker", wasOn, "airHiss"),
    );

    add(
      "radio",
      W * 0.62,
      H * 0.78,
      "Radio",
      `−${COMMS_COST} power · storm warning next day`,
      () => bridge().getDecisions().comms,
      (wasOn) => this.toggleJob("comms", wasOn, "powerHum"),
    );

    add(
      "plants",
      W * 0.48,
      H * 0.52,
      "Water plants",
      `−${GREENHOUSE_COST} power −${GREENHOUSE_WATER} water · +${GREENHOUSE_OXYGEN} O₂ +${GREENHOUSE_SCIENCE} science`,
      () => Boolean(bridge().getDecisions().greenhouse),
      (wasOn) => this.toggleJob("greenhouse", wasOn, "plantSparkle"),
    );

    add(
      "science",
      W * 0.78,
      H * 0.62,
      "Science walk",
      `−${SCIENCE_COST_PER_LEVEL} power each · +science +risk`,
      () => bridge().getDecisions().scienceLevel > 0,
      (wasOn) => {
        if (!this.canAffordFlip("scienceLevel", wasOn)) return;
        if (wasOn) {
          bridge().patchDecisions({ scienceLevel: 0 });
          audio.play("toggleOff");
        } else {
          bridge().patchDecisions({
            scienceLevel: Math.min(SCIENCE_LEVEL_MAX, 1),
          });
          audio.play("toggleOn");
          floatNumber(this, W * 0.78, H * 0.55, "+science", THEME.sageInk);
        }
        sparkBurst(this, W * 0.78, H * 0.58);
        this.afterToggle();
      },
    );

    add(
      "shield",
      W * 0.18,
      H * 0.52,
      "Build shield",
      "−2 materials · less storm risk",
      () => Boolean(bridge().getDecisions().buildShield),
      (wasOn) => {
        const mats = bridge().getState().materials;
        if (!wasOn && mats < 2) {
          bridge().setNovaLine("Need 2 materials to build a shield.");
          this.novaBubble.setText(bridge().getNovaLine());
          audio.play("uiClick");
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
        if (!wasOn) {
          sparkBurst(this, W * 0.18, H * 0.68, 0xa8e6ff);
          bridge().setNovaLine("Shelter ready. Stand on the bed when you are done.");
        } else {
          bridge().setNovaLine("Shelter off — we will stay out if a storm hits.");
        }
        this.novaBubble.setText(bridge().getNovaLine());
        this.afterToggle();
      },
      () => {
        const ev = bridge().getEvent();
        return Boolean(ev?.stormSeverity !== undefined);
      },
    );

    add(
      "filter",
      W * 0.34,
      H * 0.62,
      "Clean filter",
      "−1 material −1 power · unclog cleaner",
      () => Boolean(bridge().getDecisions().cleanFilter),
      (wasOn) => {
        if (!wasOn && (bridge().getState().recyclerEfficiency ?? 1) >= 1) {
          bridge().setNovaLine("Filter is already clean.");
          this.novaBubble.setText(bridge().getNovaLine());
          return;
        }
        this.toggleJob("cleanFilter", wasOn);
      },
      () => (bridge().getState().recyclerEfficiency ?? 1) < 1 || bridge().getDecisions().cleanFilter === true,
    );

    add(
      "bed",
      W * 0.88,
      H * 0.82,
      "Bed — end day",
      "Stand here to finish today",
      () => false,
      () => this.finishDay(),
    );
  }

  private toggleJob(
    key: "recycler" | "oxygenMaker" | "comms" | "greenhouse" | "cleanFilter",
    wasOn: boolean,
    sfx?: "waterTrickle" | "airHiss" | "powerHum" | "plantSparkle",
  ) {
    if (!this.canAffordFlip(key, wasOn)) return;
    bridge().patchDecisions({ [key]: !wasOn });
    audio.play(wasOn ? "toggleOff" : "toggleOn");
    if (!wasOn && sfx) audio.play(sfx);
    const x = this.player.x;
    const y = this.player.y - 30;
    sparkBurst(this, x, y);
    if (!wasOn) {
      if (key === "recycler") floatNumber(this, x, y, "+water save", THEME.sageInk);
      if (key === "oxygenMaker") floatNumber(this, x, y, "+O₂", THEME.sageInk);
      if (key === "greenhouse") floatNumber(this, x, y, "+plants", THEME.sageInk);
    }
    this.afterToggle();
  }

  private canAffordFlip(
    key:
      | "recycler"
      | "oxygenMaker"
      | "comms"
      | "greenhouse"
      | "cleanFilter"
      | "scienceLevel"
      | "buildShield",
    wasOn: boolean,
  ): boolean {
    if (wasOn) return true;
    const d = { ...bridge().getDecisions() };
    if (key === "scienceLevel") d.scienceLevel = Math.max(1, d.scienceLevel || 1);
    else (d as Record<string, unknown>)[key] = true;
    if (plannedPowerCost(d) > bridge().getPowerToday()) {
      bridge().setNovaLine("Not enough power cells left for that.");
      this.novaBubble.setText(bridge().getNovaLine());
      audio.play("uiClick");
      return false;
    }
    return true;
  }

  private afterToggle() {
    this.refreshHud();
    this.refreshWorldFx(false);
    for (const c of this.circles) c.refresh();
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
      if (bridge().getSheltering()) {
        audio.play("shelterClose");
        bridge().setNovaLine("We sheltered. Safer — but no outdoor science today.");
      } else {
        bridge().setNovaLine("We stayed out in the storm. Risk went up.");
      }
      this.novaBubble.setText(bridge().getNovaLine());
    }

    this.time.delayedCall(isStorm ? 700 : 200, () => {
      const deltas = bridge().endDay();
      audio.play("dayEnd");
      this.showDeltaFloaters(deltas);
    });
  }

  private showDeltaFloaters(
    deltas: { before: number; after: number; label: string }[],
  ) {
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
  }

  private refreshHud() {
    if (!bridge().ready()) return;
    const power = bridge().getPowerToday();
    const spent = plannedPowerCost(bridge().getDecisions());
    const left = Math.max(0, power - spent);
    this.powerHud.removeAll(true);
    const title = this.add
      .text(0, 0, `Day ${bridge().getDay()}/10 · Power`, {
        fontFamily: THEME.fontDisplay,
        fontSize: "13px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 8, y: 4 },
      });
    this.powerHud.add(title);
    for (let i = 0; i < power; i++) {
      const filled = i < left;
      const cell = this.add
        .rectangle(8 + i * 18, 28, 14, 22, filled ? 0xffe08a : 0x6a6570, filled ? 0.95 : 0.35)
        .setStrokeStyle(1, THEME.line, 0.35);
      this.powerHud.add(cell);
    }
    const s = bridge().getState();
    this.resourceHud.setText(
      `💧${s.water}  O₂${s.oxygen}  🔬${s.science}  ⚠${s.exposure.toFixed(0)}  mats ${s.materials}`,
    );
  }

  private refreshAlerts() {
    if (!bridge().ready()) return;
    // Warnings only if radio was on yesterday (wired in session).
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

    // Dish
    if (d.comms && !this.dishSpin && this.dishImg) {
      this.dishSpin = this.tweens.add({
        targets: this.dishImg,
        angle: 360,
        duration: reduceMotion() ? 1 : 4000,
        repeat: -1,
      });
      if (reduceMotion()) this.dishSpin.pause();
    } else if (!d.comms && this.dishSpin) {
      this.dishSpin.stop();
      this.dishSpin = null;
      this.dishImg?.setAngle(0);
    }

    // Panels glow with remaining power story
    if (this.panelsImg && !this.panelTween) {
      this.panelTween = panelGlow(this, this.panelsImg, true);
    }

    // Tanks
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
      for (const leaf of this.plantLeaves) {
        setPlantHealth(leaf, plantsOn, this);
      }
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
      this.refreshHud();
      return;
    }

    // Tap-to-walk steering (keyboard overrides).
    let pad = { x: 0, y: 0 };
    if (this.walkTarget) {
      const dx = this.walkTarget.x - this.player.x;
      const dy = this.walkTarget.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 12) {
        this.walkTarget = null;
      } else {
        pad = { x: dx / dist, y: dy / dist };
      }
    }
    // Keyboard cancels tap target.
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
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    const still = speed < STILL_SPEED;

    for (const c of this.circles) {
      const inside = c.contains(this.player.x, this.player.y);
      c.update(inside && still, dt);
    }

    this.refreshHud();
    this.refreshWorldFx(false);
    const line = bridge().getNovaLine();
    if (line && this.novaBubble.text !== line) this.novaBubble.setText(line);
  }
}
