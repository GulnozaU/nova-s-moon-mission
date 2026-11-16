import Phaser from "phaser";
import { audio } from "../../audio/audio";
import { bridge } from "../bridge";
import { isDaylight } from "../../ui/teach/dayNight";
import { applyMovement, makeKeys, type ControlKeys } from "../playerControls";
import {
  addShadow,
  dustPuff,
  fadeSlideIn,
  floatNumber,
  idleBreathe,
  oxygenBubbles,
  paintMoonGround,
  panelGlow,
  reduceMotion,
  setPlantStage,
  shieldShimmer,
  sparkBurst,
  stormWarningPulse,
  twinkleStars,
  walkHop,
} from "../anim";
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
  LOSE_OXYGEN_AT,
  LOSE_WATER_AT,
  SCIENCE_COST_PER_LEVEL,
  SCIENCE_LEVEL_MAX,
  SCIENCE_POINTS_PLAIN,
  SCIENCE_POINTS_RIM,
  SHIELD_MATERIAL_COST,
  START_OXYGEN,
  START_WATER,
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
  private plantLeaves: Phaser.GameObjects.Ellipse[] = [];
  private waterFill: Phaser.GameObjects.Rectangle | null = null;
  private oxyFill: Phaser.GameObjects.Rectangle | null = null;
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;
  private chipTray!: ChipTray;
  private crewTalk!: CrewTalk;
  private alertText!: Phaser.GameObjects.Text;
  private alertPulse: Phaser.Tweens.Tween | null = null;
  private novaBubble!: Phaser.GameObjects.Text;
  private shieldRing: Phaser.GameObjects.Arc | null = null;
  private crateRoots: Phaser.GameObjects.Container[] = [];
  private lastFootstep = 0;
  private lastDay = -1;
  private ending = false;
  private walkTarget: { x: number; y: number } | null = null;
  private doorCooldown = 0;
  private lastOxyOn: boolean | null = null;
  private lastGreenhouse: boolean | null = null;
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
    paintMoonGround(this, W, H, night, createRng(seed));
    this.add
      .image(W / 2, H * 0.58, "surface")
      .setDisplaySize(W * 0.85, H * 0.42)
      .setAlpha(0.2)
      .setDepth(1);

    if (!night) {
      this.add.ellipse(W * 0.88, H * 0.1, 70, 70, 0xffe08a, 0.5).setDepth(2);
    } else {
      const rng = createRng(seed);
      const stars: Phaser.GameObjects.Arc[] = [];
      for (let i = 0; i < 12; i++) {
        stars.push(
          this.add.circle(rng() * W, rng() * H * 0.3, 1.2, 0xffffff, 0.85).setDepth(2),
        );
      }
      twinkleStars(this, stars);
    }
    this.add.image(W * 0.08, H * 0.09, "earth").setDisplaySize(52, 52).setDepth(3);

    this.addBuilding("home", "Crew home", W * 0.22, H * 0.42, "habitat", 96, 82);
    this.addBuilding("greenhouse", "Greenhouse", W * 0.5, H * 0.38, "greenhouse", 90, 82);
    this.addBuilding("lab", "Science lab", W * 0.78, H * 0.42, "labCottage", 90, 82);

    this.panelsImg = this.add.image(W * 0.34, H * 0.68, "panels").setDisplaySize(72, 44).setDepth(7);
    this.dishImg = this.add.image(W * 0.58, H * 0.66, "dish").setDisplaySize(52, 52).setDepth(7);
    this.add.image(W * 0.86, H * 0.68, "rover").setDisplaySize(64, 42).setDepth(7);
    if (this.panelsImg) panelGlow(this, this.panelsImg, true);

    this.shieldRing = this.add
      .circle(W * 0.22, H * 0.42, 58, 0x7ec8ff, 0.08)
      .setStrokeStyle(2, 0xa8e6ff, 0.35)
      .setDepth(5);

    this.buildTanks(W, H);
    this.buildPlants(W, H);
    this.buildOutdoorJobs(W, H);
    this.buildMaterialCrates(W, H);

    const spawn = this.spawnPoint(W, H);
    this.player = this.physics.add
      .sprite(spawn.x, spawn.y, "nova")
      .setDisplaySize(48, 64)
      .setCollideWorldBounds(true)
      .setDepth(20);
    this.player.body!.setSize(24, 18);
    this.player.body!.setOffset(14, 44);
    this.physics.world.setBounds(16, H * 0.36, W - 32, H * 0.5);

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
        y: Phaser.Math.Clamp(p.worldY, H * 0.4, H * 0.86),
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
    if (this.spawnNear === "home") return { x: W * 0.22, y: H * 0.62 };
    if (this.spawnNear === "greenhouse") return { x: W * 0.5, y: H * 0.58 };
    if (this.spawnNear === "lab") return { x: W * 0.78, y: H * 0.62 };
    return { x: W * 0.5, y: H * 0.72 };
  }

  private goPlace(room: "home" | "greenhouse" | "lab") {
    const d = this.doors.find((x) => x.room === room);
    if (!d) {
      this.enterRoom(room);
      return;
    }
    this.walkTarget = { x: d.x, y: d.y };
  }

  private addBuilding(
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
      .text(x, y - h * 0.52, label, {
        fontFamily: THEME.fontDisplay,
        fontSize: "11px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(25);
    const doorY = y + h * 0.38;
    this.add
      .rectangle(x, doorY, 36, 22, 0x5a4030, 0.95)
      .setStrokeStyle(2, 0xffe08a, 0.8)
      .setDepth(9);
    this.add
      .text(x, doorY, "DOOR", {
        fontFamily: THEME.font,
        fontSize: "9px",
        color: THEME.cream,
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.doors.push({ room, x, y: doorY, r: 28 });
    if (room === "home") this.homeDoorPos = { x, y: doorY };
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
      if (room === "home" && idx === 1) advanceTutorial("enter_home");
      if (room === "home" && idx === 5) advanceTutorial("back_home");
    }
    this.doorCooldown = 500;
    audio.play("door");
    sparkBurst(this, this.player.x, this.player.y - 10);
    this.cameras.main.fadeOut(120, 42, 34, 28);
    this.time.delayedCall(130, () => {
      this.scene.start("indoor", { room });
    });
  }

  private buildTanks(W: number, H: number) {
    const mk = (x: number, label: string, color: number) => {
      this.add.rectangle(x, H * 0.55, 22, 54, 0x2a2218, 0.9).setStrokeStyle(2, THEME.line, 0.3).setDepth(8);
      const fill = this.add.rectangle(x, H * 0.55 + 24, 16, 48, color, 0.9).setOrigin(0.5, 1).setDepth(9);
      this.add.text(x, H * 0.55 - 34, label, { fontFamily: THEME.font, fontSize: "9px", color: THEME.cream }).setOrigin(0.5).setDepth(10);
      return fill;
    };
    this.waterFill = mk(W * 0.06, "H₂O", 0x3a7ca5);
    this.oxyFill = mk(W * 0.1, "O₂", 0x2f7d4a);
  }

  private buildPlants(W: number, H: number) {
    this.plantLeaves = [];
    for (let i = 0; i < 3; i++) {
      const x = W * (0.44 + i * 0.04);
      const y = H * 0.5;
      const leaf = this.add.ellipse(x, y, 22, 28, 0x8a6a3a).setDepth(8);
      this.add.rectangle(x, y + 16, 16, 10, 0x6b4a2a).setDepth(8);
      this.plantLeaves.push(leaf);
    }
  }

  private buildMaterialCrates(W: number, H: number) {
    for (let i = 0; i < 3; i++) {
      const c = this.add.container(W * 0.12 + i * 28, H * 0.78).setDepth(16);
      const box = this.add.rectangle(0, 0, 22, 18, 0xb08968, 0.95).setStrokeStyle(2, THEME.line, 0.4);
      const t = this.add.text(0, 0, "📦", { fontSize: "12px" }).setOrigin(0.5);
      c.add([box, t]);
      c.setSize(24, 20);
      c.setInteractive(
        new Phaser.Geom.Rectangle(-12, -10, 24, 20),
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
        this.drag.begin({ kind: "material", amount: SHIELD_MATERIAL_COST }, p.worldX, p.worldY, 0xb08968);
      });
      this.crateRoots.push(c);
    }
  }

  private buildOutdoorJobs(W: number, H: number) {
    const sciPts =
      bridge().ready() && bridge().getState().site === "plain"
        ? SCIENCE_POINTS_PLAIN
        : SCIENCE_POINTS_RIM;

    this.radioPos = { x: W * 0.58, y: H * 0.78 };
    this.addStation(
      new JobStation(this, {
        id: "radio",
        x: W * 0.58,
        y: H * 0.78,
        label: "Radio dish",
        costs: [{ icon: "⚡", value: -COMMS_COST }],
        benefits: [{ icon: "📡", value: "warn" }],
        accept: "chip",
        chipCost: COMMS_COST,
        getOn: () => bridge().getDecisions().comms,
        getFill: () => this.fills.radio ?? 0,
        onDrop: (p) =>
          this.dropChips("radio", COMMS_COST, p.amount, (on) => {
            bridge().patchDecisions({ comms: on });
            if (on) {
              audio.play("powerHum");
              floatNumber(this, W * 0.58, H * 0.7, "Radio ON", THEME.sageInk);
              advanceTutorial("radio_chip");
            }
            this.refreshWorldFx(false);
          }),
      }),
    );

    this.addStation(
      new JobStation(this, {
        id: "science",
        x: W * 0.72,
        y: H * 0.78,
        label: "Science walk",
        costs: [
          { icon: "⚡", value: -SCIENCE_COST_PER_LEVEL },
          { icon: "⚠", value: "+risk" },
        ],
        benefits: [{ icon: "🔬", value: `+${sciPts}` }],
        accept: "chip",
        chipCost: 1,
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
          floatNumber(this, W * 0.72, H * 0.7, `+1 walk · risk`, THEME.rose);
          const storm = bridge().getEvent()?.stormSeverity !== undefined;
          if (storm) floatNumber(this, W * 0.72, H * 0.64, "storm exposure!", THEME.rose);
          this.afterJob();
          return true;
        },
      }),
    );

    this.addStation(
      new JobStation(this, {
        id: "shield",
        x: W * 0.28,
        y: H * 0.62,
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
          shieldShimmer(this, W * 0.22, H * 0.42, (bridge().getState().shieldLevel || 0) + 1);
          floatNumber(this, W * 0.28, H * 0.55, "Shield +1 tonight", THEME.sageInk);
          this.syncShieldVisual(true);
          this.afterJob();
          return true;
        },
      }),
    );

    // Drop crew portraits (or Nova) onto Crew home door to shelter.
    this.addStation(
      new JobStation(this, {
        id: "crew_home_shelter",
        x: W * 0.22,
        y: H * 0.62,
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
            // Nova herself counts as "all in" toggle for solo play.
            bridge().setSheltering(true);
            bridge().patchDecisions({ shelteredCrewCount: 3 });
            this.say("Nova ducks into Crew home.");
            this.afterJob();
            return true;
          }
          if (ok) {
            audio.play("shelterClose");
            floatNumber(this, W * 0.22, H * 0.55, "Safe inside!", THEME.sageInk);
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
      this.shieldRing.setRadius(50 + lv * 10);
      this.shieldRing.setAlpha(lv > 0 ? 0.18 : 0.06);
      if (lv > 0 && !reduceMotion()) {
        this.tweens.add({
          targets: this.shieldRing,
          alpha: { from: 0.12, to: 0.28 },
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
    const water01 = (st.water - LOSE_WATER_AT) / Math.max(1, START_WATER - LOSE_WATER_AT);
    const oxy01 = (st.oxygen - LOSE_OXYGEN_AT) / Math.max(1, START_OXYGEN - LOSE_OXYGEN_AT);
    this.waterFill?.setDisplaySize(16, Math.max(4, 48 * Phaser.Math.Clamp(water01, 0, 1)));
    this.oxyFill?.setDisplaySize(16, Math.max(4, 48 * Phaser.Math.Clamp(oxy01, 0, 1)));
    const oxyOn = Boolean(d.oxygenMaker);
    if (force || oxyOn !== this.lastOxyOn) {
      this.lastOxyOn = oxyOn;
      this.bubbleTimer?.remove(false);
      this.bubbleTimer = null;
      if (oxyOn && this.oxyFill) {
        this.bubbleTimer = oxygenBubbles(this, this.oxyFill.x, this.oxyFill.y - 30, true);
      }
    }
    const plantsOn = Boolean(d.greenhouse);
    if (force || plantsOn !== this.lastGreenhouse) {
      this.lastGreenhouse = plantsOn;
      for (const leaf of this.plantLeaves) setPlantStage(leaf, plantsOn ? 3 : 0);
    }
    const mats = st.materials;
    for (let i = 0; i < this.crateRoots.length; i++) {
      this.crateRoots[i]!.setAlpha(mats >= SHIELD_MATERIAL_COST ? 1 : 0.35);
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
