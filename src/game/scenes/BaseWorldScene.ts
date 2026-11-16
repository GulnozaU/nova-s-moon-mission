import Phaser from "phaser";
import { audio } from "../../audio/audio";
import { bridge } from "../bridge";
import { isDaylight } from "../../ui/teach/dayNight";
import { applyMovement, makeKeys, type ControlKeys } from "../playerControls";
import {
  addShadow,
  dustPuff,
  ensureSoftPadTexture,
  fadeSlideIn,
  floatNumber,
  idleBreathe,
  panelGlow,
  pulseDoorGlow,
  reduceMotion,
  roverIdleBounce,
  shieldShimmer,
  sparkBurst,
  stormWarningPulse,
  twinkleStars,
  walkHop,
} from "../anim";
import { HUB, HUB_ART_KEY, uvToWorld } from "../hubLayout";
import { ChipTray } from "../ui/ChipTray";
import { PlaceHud } from "../ui/PlaceHud";
import { CrewTalk } from "../ui/CrewTalk";
import { JobStation } from "../ui/JobStation";
import { GuideCoach } from "../ui/GuideCoach";
import { MorningTalk } from "../ui/MorningTalk";
import {
  StormCrewHud,
  countSheltered,
  type CrewShelterMap,
} from "../ui/StormCrewHud";
import { DragController } from "../drag/DragController";
import {
  advanceTutorial,
  getCrewShelter,
  getTutorial,
  isTutorialActive,
  resetTutorialForDay,
  setCrewShelter,
} from "../tutorial/session";
import { THEME } from "../theme";
import { createRng } from "../../engine/rng";
import {
  COMMS_COST,
  SCIENCE_COST_PER_LEVEL,
  SCIENCE_LEVEL_MAX,
  SCIENCE_POINTS_PLAIN,
  SCIENCE_POINTS_RIM,
  SHIELD_MATERIAL_COST,
} from "../../engine/constants";
import { plannedPowerCost } from "../../ui/powerMath";

type Door = {
  room: "home" | "greenhouse" | "lab";
  x: number;
  y: number;
  r: number;
};

/**
 * Compact Moon surface hub — drag chips/materials onto outdoor jobs.
 */
export class BaseWorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys: ControlKeys | null = null;
  private shadowSync!: () => void;
  private walkSync!: () => void;
  private doors: Door[] = [];
  private stations: JobStation[] = [];
  private drag!: DragController;
  private dishImg: Phaser.GameObjects.Image | null = null;
  private dishSpin: Phaser.Tweens.Tween | null = null;
  private panelsImg: Phaser.GameObjects.Image | null = null;
  private chipTray!: ChipTray;
  private crewTalk!: CrewTalk;
  private alertText!: Phaser.GameObjects.Text;
  private alertPulse: Phaser.Tweens.Tween | null = null;
  private novaBubble!: Phaser.GameObjects.Text;
  private shieldRing: Phaser.GameObjects.Image | null = null;
  private crateRoots: Phaser.GameObjects.Container[] = [];
  private doorGlows: Phaser.GameObjects.Image[] = [];
  private lastFootstep = 0;
  private lastDay = -1;
  private ending = false;
  private walkTarget: { x: number; y: number } | null = null;
  private doorCooldown = 0;
  private lastComms: boolean | null = null;
  private lastShield = -1;
  private spawnNear: string | null = null;
  private fills: Record<string, number> = {};
  private coach: GuideCoach | null = null;
  private morning: MorningTalk | null = null;
  private stormHud: StormCrewHud | null = null;
  private homeDoorPos = { x: 0, y: 0 };
  private radioPos = { x: 0, y: 0 };

  constructor() {
    super("base");
  }

  init(data?: { spawnNear?: string }) {
    this.spawnNear = data?.spawnNear ?? null;
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.ending = false;
    this.doors = [];
    this.stations = [];
    this.fills = {};
    this.crateRoots = [];
    this.doorCooldown = 400;
    fadeSlideIn(this, false);
    this.drag = new DragController(this);
    ensureSoftPadTexture(this);

    let night = false;
    try {
      night = !isDaylight(bridge().getState().site, bridge().getState().day);
    } catch {
      /* */
    }
    let seed = 42;
    try {
      seed = bridge().getDay() * 7919 + 3;
    } catch {
      /* */
    }

    // Full-bleed soft-pixel hub painting (Gemini) — one composition, no stacked boxes.
    this.cameras.main.setBackgroundColor(0x6a7a88);
    this.add
      .image(W / 2, H / 2, HUB_ART_KEY)
      .setDisplaySize(W, H)
      .setDepth(0);
    if (night) {
      this.add.rectangle(0, 0, W, H, 0x1a2030, 0.42).setOrigin(0).setDepth(1);
      const rng = createRng(seed);
      const stars: Phaser.GameObjects.Arc[] = [];
      for (let i = 0; i < 16; i++) {
        stars.push(
          this.add
            .circle(rng() * W, rng() * H * 0.32, 1.1 + rng(), 0xffffff, 0.85)
            .setDepth(2),
        );
      }
      twinkleStars(this, stars);
    }
    this.add
      .image(W * 0.07, H * 0.08, "earth")
      .setDisplaySize(44, 44)
      .setDepth(3)
      .setAlpha(0.92);

    // Soft door footprints on painted doors — navigation without brown rectangles.
    this.addDoorHotspot("home", "Home", HUB.homeDoor, 0xf0a070, W, H);
    this.addDoorHotspot("greenhouse", "Plants", HUB.greenhouseDoor, 0x8fa887, W, H);
    this.addDoorHotspot("lab", "Lab", HUB.labDoor, 0x7aa7c4, W, H);

    // Living overlays only where motion sells the painting (not duplicate buildings).
    const panelPos = uvToWorld(W, H, HUB.panels);
    this.panelsImg = this.add
      .image(panelPos.x, panelPos.y, "panels")
      .setDisplaySize(78, 48)
      .setAlpha(0.55)
      .setDepth(7);
    panelGlow(this, this.panelsImg, true);

    const dishPos = uvToWorld(W, H, HUB.dish);
    this.dishImg = this.add
      .image(dishPos.x, dishPos.y, "dish")
      .setDisplaySize(56, 56)
      .setAlpha(0.0)
      .setDepth(8);

    const roverPos = uvToWorld(W, H, HUB.rover);
    // Bounce a soft pad under the painted rover so drag targets feel alive.
    const roverPad = this.add
      .image(roverPos.x, roverPos.y + 10, "softPad")
      .setDisplaySize(64, 28)
      .setTint(0xe2b48a)
      .setAlpha(0.45)
      .setDepth(7);
    roverIdleBounce(this, roverPad);

    const home = uvToWorld(W, H, HUB.homeDoor);
    this.shieldRing = this.add
      .image(home.x, home.y - 36, "softPad")
      .setDisplaySize(90, 48)
      .setTint(0x7ec8ff)
      .setAlpha(0.12)
      .setDepth(5);

    this.buildOutdoorJobs(W, H);
    this.buildMaterialCrates(W, H);

    const spawn = this.spawnPoint(W, H);
    this.player = this.physics.add
      .sprite(spawn.x, spawn.y, "nova")
      .setDisplaySize(46, 60)
      .setCollideWorldBounds(true)
      .setDepth(20);
    this.player.body!.setSize(22, 16);
    this.player.body!.setOffset(14, 42);
    this.physics.world.setBounds(
      20,
      H * HUB.walkMinV,
      W - 40,
      H * (HUB.walkMaxV - HUB.walkMinV),
    );

    const sh = addShadow(this, this.player, 40);
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
      if (this.ending || this.crewTalk?.isOpen() || this.drag.dragging) return;
      this.walkTarget = {
        x: p.worldX,
        y: Phaser.Math.Clamp(p.worldY, H * HUB.walkMinV, H * HUB.walkMaxV),
      };
    });

    this.chipTray = new ChipTray(this);
    this.chipTray.setDrag(this.drag);
    if (bridge().ready()) resetTutorialForDay(bridge().getDay());
    // Day-1 tutorial replaces first-visit chatter.
    this.crewTalk = isTutorialActive()
      ? ({ isOpen: () => false } as CrewTalk)
      : new CrewTalk(this, "surface");
    this.coach = new GuideCoach(this);
    this.morning = new MorningTalk(this);
    if (bridge().ready() && bridge().getEvent()?.stormSeverity !== undefined) {
      audio.play("stormRumble");
      this.stormHud = new StormCrewHud(
        this,
        this.drag,
        getCrewShelter(),
        (s: CrewShelterMap) => {
          setCrewShelter(s);
          bridge().patchDecisions({ shelteredCrewCount: countSheltered(s) });
          bridge().setSheltering(countSheltered(s) >= 3);
        },
      );
    }
    new PlaceHud(
      this,
      [
        { id: "surface", label: "Surface", go: () => (this.walkTarget = { x: W * 0.5, y: H * 0.72 }) },
        { id: "home", label: "Home", go: () => this.goPlace("home") },
        { id: "greenhouse", label: "Plants", go: () => this.goPlace("greenhouse") },
        { id: "lab", label: "Lab", go: () => this.goPlace("lab") },
      ],
      "surface",
    );

    this.alertText = this.add
      .text(W / 2, 78, "", {
        fontFamily: THEME.fontDisplay,
        fontSize: "12px",
        color: "#fff8ef",
        backgroundColor: "#c98b7b",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setDepth(82)
      .setScrollFactor(0)
      .setVisible(false);

    this.novaBubble = this.add
      .text(W / 2, H - 10, "", {
        fontFamily: THEME.font,
        fontSize: "12px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 8, y: 5 },
        align: "center",
        wordWrap: { width: W - 36 },
      })
      .setOrigin(0.5, 1)
      .setDepth(82)
      .setScrollFactor(0);

    this.time.delayedCall(80, () => {
      if (!bridge().ready()) return;
      this.lastDay = bridge().getDay();
      if (this.lastDay === 1) audio.play("dayStart");
      this.refreshAlerts();
      this.refreshWorldFx(true);
      this.chipTray.refresh(true);
      const line = bridge().getNovaLine();
      if (line) this.novaBubble.setText(line);
      this.syncShieldVisual(true);
    });
  }

  private spawnPoint(W: number, H: number) {
    if (this.spawnNear === "home") return uvToWorld(W, H, { u: HUB.homeDoor.u, v: 0.78 });
    if (this.spawnNear === "greenhouse")
      return uvToWorld(W, H, { u: HUB.greenhouseDoor.u, v: 0.8 });
    if (this.spawnNear === "lab") return uvToWorld(W, H, { u: HUB.labDoor.u, v: 0.78 });
    return uvToWorld(W, H, HUB.spawn);
  }

  private goPlace(room: "home" | "greenhouse" | "lab") {
    const d = this.doors.find((x) => x.room === room);
    if (!d) {
      this.enterRoom(room);
      return;
    }
    this.walkTarget = { x: d.x, y: d.y };
  }

  /** Soft glowing footprint on a painted door — walk into it to enter. */
  private addDoorHotspot(
    room: "home" | "greenhouse" | "lab",
    label: string,
    uv: { u: number; v: number },
    tint: number,
    W: number,
    H: number,
  ) {
    const { x, y } = uvToWorld(W, H, uv);
    const glow = this.add
      .image(x, y + 6, "softPad")
      .setDisplaySize(72, 34)
      .setTint(tint)
      .setAlpha(0.55)
      .setDepth(9);
    pulseDoorGlow(this, glow);
    this.doorGlows.push(glow);
    this.add
      .text(x, y - 22, label, {
        fontFamily: THEME.fontDisplay,
        fontSize: "12px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(25);
    this.doors.push({ room, x, y, r: 34 });
    if (room === "home") this.homeDoorPos = { x, y };
  }

  private enterRoom(room: "home" | "greenhouse" | "lab") {
    if (this.doorCooldown > 0 || this.ending) return;
    if (isTutorialActive()) {
      const idx = getTutorial().index;
      // Block leaving surface before radio chip.
      if (idx === 0) {
        this.say("First, chip the radio — follow the arrow.");
        return;
      }
      if (room === "home" && idx === 1) {
        const tip = advanceTutorial("enter_home");
        if (tip) bridge().setNovaLine(tip);
      }
    }
    this.doorCooldown = 500;
    audio.play("door");
    sparkBurst(this, this.player.x, this.player.y - 10);
    this.cameras.main.fadeOut(120, 42, 34, 28);
    this.time.delayedCall(130, () => {
      this.scene.start("indoor", { room });
    });
  }

  private buildMaterialCrates(W: number, H: number) {
    const base = uvToWorld(W, H, HUB.crates);
    for (let i = 0; i < 2; i++) {
      const c = this.add.container(base.x + i * 36, base.y).setDepth(16);
      const img = this.add
        .image(0, 0, "crates")
        .setDisplaySize(40, 32)
        .setOrigin(0.5);
      c.add(img);
      c.setSize(44, 36);
      c.setInteractive(
        new Phaser.Geom.Rectangle(-22, -18, 44, 36),
        Phaser.Geom.Rectangle.Contains,
      );
      c.on("pointerdown", (p: Phaser.Input.Pointer) => {
        if (!bridge().ready() || this.drag.dragging) return;
        if (bridge().getState().materials < SHIELD_MATERIAL_COST) {
          this.say("Need more materials.");
          return;
        }
        if (bridge().getDecisions().buildShield) {
          this.say("Shield layer already queued today.");
          return;
        }
        p.event.stopPropagation();
        this.drag.begin(
          { kind: "material", amount: SHIELD_MATERIAL_COST },
          p.worldX,
          p.worldY,
          0xb08968,
        );
      });
      this.crateRoots.push(c);
    }
  }

  private buildOutdoorJobs(W: number, H: number) {
    const sciPts =
      bridge().ready() && bridge().getState().site === "plain"
        ? SCIENCE_POINTS_PLAIN
        : SCIENCE_POINTS_RIM;

    const radio = uvToWorld(W, H, HUB.radio);
    const rover = uvToWorld(W, H, HUB.rover);
    const shield = uvToWorld(W, H, HUB.shield);
    const home = uvToWorld(W, H, HUB.homeDoor);

    this.radioPos = radio;
    this.addStation(
      new JobStation(this, {
        id: "radio",
        x: radio.x,
        y: radio.y,
        label: "Radio dish",
        costs: [{ icon: "⚡", value: -COMMS_COST }],
        benefits: [{ icon: "📡", value: "warn" }],
        accept: "chip",
        chipCost: COMMS_COST,
        artKey: "radioConsole",
        artW: 52,
        artH: 44,
        getOn: () => bridge().getDecisions().comms,
        getFill: () => this.fills.radio ?? 0,
        onDrop: (p) =>
          this.dropChips("radio", COMMS_COST, p.amount, (on) => {
            bridge().patchDecisions({ comms: on });
            if (on) {
              audio.play("powerHum");
              floatNumber(this, radio.x, radio.y - 40, "Radio ON", THEME.sageInk);
              const tip = advanceTutorial("radio_chip");
              if (tip) bridge().setNovaLine(tip);
            }
            this.refreshWorldFx(false);
          }),
      }),
    );

    this.addStation(
      new JobStation(this, {
        id: "science",
        x: rover.x,
        y: rover.y,
        label: "Science walk",
        costs: [
          { icon: "⚡", value: -SCIENCE_COST_PER_LEVEL },
          { icon: "⚠", value: "+risk" },
        ],
        benefits: [{ icon: "🔬", value: `+${sciPts}` }],
        accept: "chip",
        chipCost: 1,
        // Pad only — painting already has the rover (no stacked cutout).
        getOn: () => bridge().getDecisions().scienceLevel > 0,
        onDrop: () => {
          const d = bridge().getDecisions();
          const next = Math.min(SCIENCE_LEVEL_MAX, d.scienceLevel + 1);
          if (next === d.scienceLevel) {
            this.say("Max science walks today.");
            return false;
          }
          if (plannedPowerCost({ ...d, scienceLevel: next }) > bridge().getPowerToday()) {
            this.say("Not enough power chips.");
            return false;
          }
          bridge().patchDecisions({ scienceLevel: next });
          floatNumber(this, rover.x, rover.y - 36, `+1 walk · risk`, THEME.rose);
          const storm = bridge().getEvent()?.stormSeverity !== undefined;
          if (storm) floatNumber(this, rover.x, rover.y - 54, "storm exposure!", THEME.rose);
          this.afterJob();
          return true;
        },
      }),
    );

    this.addStation(
      new JobStation(this, {
        id: "shield",
        x: shield.x,
        y: shield.y,
        label: "Shield frame",
        costs: [{ icon: "📦", value: -SHIELD_MATERIAL_COST }],
        benefits: [{ icon: "🛡", value: "−risk" }],
        accept: "material",
        radius: 40,
        getOn: () => Boolean(bridge().getDecisions().buildShield),
        onDrop: () => {
          if (bridge().getDecisions().buildShield) {
            this.say("Already building a shield layer today.");
            return false;
          }
          if (bridge().getState().materials < SHIELD_MATERIAL_COST) {
            this.say("Need 2 materials.");
            return false;
          }
          bridge().patchDecisions({ buildShield: true });
          shieldShimmer(this, home.x, home.y - 20, (bridge().getState().shieldLevel || 0) + 1);
          floatNumber(this, shield.x, shield.y - 36, "Shield +1 tonight", THEME.sageInk);
          this.syncShieldVisual(true);
          this.afterJob();
          return true;
        },
      }),
    );

    // Drop Nova onto Home door pad to shelter (storm days).
    this.addStation(
      new JobStation(this, {
        id: "crew_home_shelter",
        x: home.x,
        y: home.y + 8,
        label: "Shelter drop",
        costs: [{ icon: "👨‍🚀", value: 0 }],
        benefits: [{ icon: "🛡", value: "safer" }],
        accept: "nova",
        radius: 44,
        getOn: () => countSheltered(getCrewShelter()) >= 3,
        onDrop: (p) => {
          if (bridge().getEvent()?.stormSeverity === undefined) {
            this.say("No storm today — no need to shelter.");
            return false;
          }
          const ok = this.stormHud?.tryReceive(p.sourceId) ?? false;
          if (!ok && p.sourceId) {
            bridge().setSheltering(true);
            bridge().patchDecisions({ shelteredCrewCount: 3 });
            this.say("Nova ducks into Crew home.");
            this.afterJob();
            return true;
          }
          if (ok) {
            audio.play("shelterClose");
            floatNumber(this, home.x, home.y - 30, "Safe inside!", THEME.sageInk);
            this.afterJob();
          }
          return ok;
        },
        isAvailable: () => bridge().getEvent()?.stormSeverity !== undefined,
      }),
    );
  }

  private addStation(station: JobStation) {
    this.stations.push(station);
    this.drag.register(station);
  }

  private dropChips(
    id: string,
    need: number,
    amount: number,
    apply: (on: boolean) => void,
  ): boolean {
    const d = bridge().getDecisions();
    if (id === "radio" && d.comms) {
      apply(false);
      this.fills[id] = 0;
      this.afterJob();
      return true;
    }
    const have = Math.min(need, (this.fills[id] ?? 0) + amount);
    if (have >= need) {
      if (
        id === "radio" &&
        plannedPowerCost({ ...d, comms: true }) > bridge().getPowerToday()
      ) {
        this.say("Not enough power chips.");
        return false;
      }
      this.fills[id] = 0;
      apply(true);
      this.afterJob();
      return true;
    }
    this.fills[id] = have;
    this.afterJob();
    return true;
  }

  private heldTotal(): number {
    let n = 0;
    for (const v of Object.values(this.fills)) n += v;
    return n;
  }

  private afterJob() {
    this.chipTray.setHeldExtra(this.heldTotal());
    this.chipTray.refresh(true);
    for (const s of this.stations) s.refresh();
  }

  private say(msg: string) {
    bridge().setNovaLine(msg);
    this.novaBubble.setText(msg);
  }

  private syncShieldVisual(force: boolean) {
    if (!bridge().ready()) return;
    const lv = bridge().getState().shieldLevel + (bridge().getDecisions().buildShield ? 1 : 0);
    if (!force && lv === this.lastShield) return;
    this.lastShield = lv;
    if (this.shieldRing) {
      this.shieldRing.setDisplaySize(80 + lv * 14, 42 + lv * 6);
      this.shieldRing.setAlpha(lv > 0 ? 0.28 : 0.1);
      if (lv > 0 && !reduceMotion()) {
        this.tweens.add({
          targets: this.shieldRing,
          alpha: { from: 0.16, to: 0.4 },
          duration: 900,
          yoyo: true,
          repeat: 2,
        });
      }
    }
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
      if (commsOn && this.dishImg) {
        this.dishImg.setAlpha(0.95);
        if (!this.dishSpin) {
          this.dishSpin = this.tweens.add({
            targets: this.dishImg,
            angle: 360,
            duration: reduceMotion() ? 1 : 5200,
            repeat: -1,
            ease: "Linear",
          });
          if (reduceMotion()) this.dishSpin.pause();
        }
      } else if (!commsOn) {
        this.dishSpin?.stop();
        this.dishSpin = null;
        this.dishImg?.setAngle(0).setAlpha(0);
      }
    }
    const mats = st.materials;
    for (let i = 0; i < this.crateRoots.length; i++) {
      this.crateRoots[i]!.setAlpha(mats >= SHIELD_MATERIAL_COST ? 1 : 0.4);
    }
    this.syncShieldVisual(false);
  }

  update(_t: number, dt: number) {
    if (!this.player?.body || !bridge().ready()) return;
    if (this.doorCooldown > 0) this.doorCooldown -= dt;

    const day = bridge().getDay();
    if (this.lastDay > 0 && day !== this.lastDay && !this.ending) {
      this.scene.restart();
      return;
    }

    if (
      this.ending ||
      this.crewTalk?.isOpen() ||
      this.morning?.isOpen() ||
      this.drag.dragging
    ) {
      this.player.setVelocity(0, 0);
      if (this.drag.dragging) {
        this.shadowSync?.();
        return;
      }
      return;
    }

    this.coach?.sync(
      getTutorial(),
      {
        radio: this.radioPos,
        home_door: this.homeDoorPos,
      },
      "surface",
    );

    // Nova drag for shelter
    if (!this.player.input) {
      this.player.setInteractive({ useHandCursor: true });
      this.player.on("pointerdown", (p: Phaser.Input.Pointer) => {
        if (bridge().getEvent()?.stormSeverity === undefined) return;
        p.event.stopPropagation();
        this.drag.begin({ kind: "nova", amount: 1 }, p.worldX, p.worldY);
      });
    }

    let pad = { x: 0, y: 0 };
    if (this.walkTarget) {
      const dx = this.walkTarget.x - this.player.x;
      const dy = this.walkTarget.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 10) this.walkTarget = null;
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

    if (this.doorCooldown <= 0) {
      for (const d of this.doors) {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, d.x, d.y) < d.r) {
          this.enterRoom(d.room);
          break;
        }
      }
    }

    this.chipTray.setHeldExtra(this.heldTotal());
    this.chipTray.refresh(false);
    this.refreshWorldFx(false);
    const line = bridge().getNovaLine();
    if (line && this.novaBubble.text !== line) this.novaBubble.setText(line);
  }
}
