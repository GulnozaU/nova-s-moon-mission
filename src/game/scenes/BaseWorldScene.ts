import Phaser from "phaser";
import { audio } from "../../audio/audio";
import { bridge } from "../bridge";
import { isDaylight } from "../../ui/teach/dayNight";
import {
  ensureSoftPadTexture,
  fadeSlideIn,
  floatNumber,
  pulseDoorGlow,
  reduceMotion,
  shieldShimmer,
  sparkBurst,
  stormWarningPulse,
  twinkleStars,
} from "../anim";
import { HUB, HUB_ART_KEY, uvToWorld } from "../hubLayout";
import { ChipTray } from "../ui/ChipTray";
import { JobLegend } from "../ui/JobLegend";
import { PlaceHud } from "../ui/PlaceHud";
import { paintSideRail, WORLD_H, WORLD_W, worldX, worldY } from "../ui/railLayout";
import { CrewTalk } from "../ui/CrewTalk";
import { JobStation } from "../ui/JobStation";
import { GuideCoach } from "../ui/GuideCoach";
import { MorningTalk } from "../ui/MorningTalk";
import { NovaGuide } from "../ui/NovaGuide";
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
  private doors: Door[] = [];
  private stations: JobStation[] = [];
  private drag!: DragController;
  private dishImg: Phaser.GameObjects.Image | null = null;
  private dishSpin: Phaser.Tweens.Tween | null = null;
  private chipTray!: ChipTray;
  private legend!: JobLegend;
  private crewTalk!: CrewTalk;
  private alertText!: Phaser.GameObjects.Text;
  private alertPulse: Phaser.Tweens.Tween | null = null;
  private guide!: NovaGuide;
  private shieldRing: Phaser.GameObjects.Image | null = null;
  private crateRoots: Phaser.GameObjects.Container[] = [];
  private doorGlows: Phaser.GameObjects.Image[] = [];
  private lastDay = -1;
  private ending = false;
  private doorCooldown = 0;
  private lastComms: boolean | null = null;
  private lastShield = -1;
  private fills: Record<string, number> = {};
  private coach: GuideCoach | null = null;
  private morning: MorningTalk | null = null;
  private stormHud: StormCrewHud | null = null;
  private homeDoorPos = { x: 0, y: 0 };
  private radioPos = { x: 0, y: 0 };

  constructor() {
    super("base");
  }

  init(_data?: { spawnNear?: string }) {
    /* spawnNear unused — places are tap-to-enter now */
  }

  create() {
    this.ending = false;
    this.doors = [];
    this.stations = [];
    this.fills = {};
    this.crateRoots = [];
    this.doorCooldown = 0;
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

    // Painting fills the world frame. Reading stays on the left rail.
    paintSideRail(this);
    this.cameras.main.setBackgroundColor(0x6a7a88);
    this.add
      .image(worldX(0.5), worldY(0.5), HUB_ART_KEY)
      .setDisplaySize(WORLD_W, WORLD_H)
      .setDepth(0);
    if (night) {
      this.add
        .rectangle(worldX(0), 0, WORLD_W, WORLD_H, 0x1a2030, 0.42)
        .setOrigin(0)
        .setDepth(1);
      const rng = createRng(seed);
      const stars: Phaser.GameObjects.Arc[] = [];
      for (let i = 0; i < 16; i++) {
        stars.push(
          this.add
            .circle(worldX(rng()), worldY(rng() * 0.32), 1.1 + rng(), 0xffffff, 0.85)
            .setDepth(2),
        );
      }
      twinkleStars(this, stars);
    }
    this.add
      .image(worldX(0.08), worldY(0.1), "earth")
      .setDisplaySize(44, 44)
      .setDepth(3)
      .setAlpha(0.92);

    // Soft door footprints — tap the painted door, or use Places on the left.
    this.addDoorHotspot("home", HUB.homeDoor, 0xf0a070);
    this.addDoorHotspot("greenhouse", HUB.greenhouseDoor, 0x8fa887);
    this.addDoorHotspot("lab", HUB.labDoor, 0x7aa7c4);

    // Dish spins only after the radio is on. No extra panel cutout on the painting.
    const dishPos = uvToWorld(HUB.dish);
    this.dishImg = this.add
      .image(dishPos.x, dishPos.y, "dish")
      .setDisplaySize(56, 56)
      .setAlpha(0.0)
      .setDepth(8);

    const home = uvToWorld(HUB.homeDoor);
    this.shieldRing = this.add
      .image(home.x, home.y - 36, "softPad")
      .setDisplaySize(90, 48)
      .setTint(0x7ec8ff)
      .setAlpha(0.12)
      .setDepth(5);

    this.buildOutdoorJobs();
    this.buildMaterialCrates();

    this.chipTray = new ChipTray(this);
    this.chipTray.setDrag(this.drag);
    this.guide = new NovaGuide(this, this.drag);
    if (bridge().ready()) resetTutorialForDay(bridge().getDay());
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
        {
          id: "surface",
          label: "Surface",
          go: () => this.guide.say("You are on the Surface. Drag chips onto the glows."),
        },
        { id: "home", label: "Home", go: () => this.enterRoom("home") },
        { id: "greenhouse", label: "Plants", go: () => this.enterRoom("greenhouse") },
        { id: "lab", label: "Lab", go: () => this.enterRoom("lab") },
      ],
      "surface",
    );

    this.legend = new JobLegend(this);
    this.alertText = this.add
      .text(worldX(0.5), 8, "", {
        fontFamily: THEME.fontDisplay,
        fontSize: "12px",
        color: "#fff8ef",
        backgroundColor: "#c98b7b",
        padding: { x: 8, y: 4 },
        align: "center",
        wordWrap: { width: WORLD_W - 48 },
      })
      .setOrigin(0.5, 0)
      .setDepth(82)
      .setScrollFactor(0)
      .setVisible(false);

    this.time.delayedCall(80, () => {
      if (!bridge().ready()) return;
      this.lastDay = bridge().getDay();
      if (this.lastDay === 1) audio.play("dayStart");
      this.refreshAlerts();
      this.refreshWorldFx(true);
      this.chipTray.refresh(true);
      this.guide.syncFromBridge();
      this.syncShieldVisual(true);
      this.syncLegend();
    });
  }

  /** Soft glowing footprint on the painted door. Names live in the left Places list. */
  private addDoorHotspot(
    room: "home" | "greenhouse" | "lab",
    uv: { u: number; v: number },
    tint: number,
  ) {
    const { x, y } = uvToWorld(uv);
    const glow = this.add
      .image(x, y + 6, "softPad")
      .setDisplaySize(72, 28)
      .setTint(tint)
      .setAlpha(0.45)
      .setDepth(9)
      .setInteractive({ useHandCursor: true });
    pulseDoorGlow(this, glow);
    glow.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      this.enterRoom(room);
    });
    this.doorGlows.push(glow);
    this.doors.push({ room, x, y, r: 36 });
    if (room === "home") this.homeDoorPos = { x, y };
  }

  private enterRoom(room: "home" | "greenhouse" | "lab") {
    if (this.doorCooldown > 0 || this.ending) return;
    if (isTutorialActive() && room === "home") {
      const tip = advanceTutorial("enter_home");
      if (tip) bridge().setNovaLine(tip);
    }
    this.doorCooldown = 500;
    audio.play("door");
    sparkBurst(this, worldX(0.5), worldY(0.55));
    this.cameras.main.fadeOut(120, 42, 34, 28);
    this.time.delayedCall(130, () => {
      this.scene.start("indoor", { room });
    });
  }

  private buildMaterialCrates() {
    const base = uvToWorld(HUB.crates);
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

  private buildOutdoorJobs() {
    const sciPts =
      bridge().ready() && bridge().getState().site === "plain"
        ? SCIENCE_POINTS_PLAIN
        : SCIENCE_POINTS_RIM;

    const radio = uvToWorld(HUB.radio);
    const rover = uvToWorld(HUB.rover);
    const shield = uvToWorld(HUB.shield);
    const home = uvToWorld(HUB.homeDoor);

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
        getOn: () => bridge().getDecisions().comms,
        getFill: () => this.fills.radio ?? 0,
        onDrop: (p) =>
          this.dropChips("radio", COMMS_COST, p.amount, (on) => {
            bridge().patchDecisions({ comms: on });
            if (on) {
              audio.play("powerHum");
              floatNumber(this, radio.x, radio.y - 40, "Radio ON", THEME.sageInk);
              const tip = advanceTutorial("radio_chip");
              this.guide.explainJob(
                tip ??
                  `Radio ON (−${COMMS_COST} chip). Effect: storm warnings if a flare is coming.`,
              );
            } else {
              this.guide.explainJob("Radio OFF — no storm warning tomorrow.");
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
        getOn: () => bridge().getDecisions().scienceLevel > 0,
        onDrop: () => {
          const d = bridge().getDecisions();
          const next = Math.min(SCIENCE_LEVEL_MAX, d.scienceLevel + 1);
          if (next === d.scienceLevel) {
            this.say("Max science walks today.");
            return false;
          }
          if (plannedPowerCost({ ...d, scienceLevel: next }) > bridge().getPowerToday()) {
            this.say("Not enough free chips — check the yellow tray.");
            return false;
          }
          bridge().patchDecisions({ scienceLevel: next });
          floatNumber(this, rover.x, rover.y - 36, `🔬+${sciPts}`, THEME.sageInk);
          const storm = bridge().getEvent()?.stormSeverity !== undefined;
          this.guide.explainJob(
            storm
              ? `Science walk: +${sciPts} science, −1 chip, MORE storm risk tonight.`
              : `Science walk: +${sciPts} science tonight, −1 chip. Extra risk if a storm hits.`,
          );
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
          this.guide.explainJob(
            `Shield queued (−${SHIELD_MATERIAL_COST} parts). Effect: less storm risk tonight.`,
          );
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
    this.syncLegend();
  }

  private syncLegend() {
    const lines: string[] = [];
    for (const s of this.stations) {
      const line = s.legendLine();
      if (line) lines.push(line);
    }
    this.legend.show(lines.length ? lines : ["Tap a glow on the picture."]);
  }

  private say(msg: string) {
    this.guide.say(msg);
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
    if (!bridge().ready()) return;
    if (this.doorCooldown > 0) this.doorCooldown -= dt;

    const day = bridge().getDay();
    if (this.lastDay > 0 && day !== this.lastDay && !this.ending) {
      this.scene.restart();
      return;
    }

    if (this.ending || this.crewTalk?.isOpen() || this.morning?.isOpen()) {
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

    this.chipTray.setHeldExtra(this.heldTotal());
    this.chipTray.refresh(false);
    this.refreshWorldFx(false);
    this.guide.syncFromBridge();
    this.syncLegend();
  }
}
