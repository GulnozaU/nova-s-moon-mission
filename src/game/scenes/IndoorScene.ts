import Phaser from "phaser";
import { audio } from "../../audio/audio";
import { bridge } from "../bridge";
import { plannedPowerCost } from "../../ui/powerMath";
import {
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
  SCIENCE_POINTS_PLAIN,
  SCIENCE_POINTS_RIM,
  WATER_USE_WITHOUT_RECYCLER,
  WATER_USE_WITH_RECYCLER,
} from "../../engine/constants";
import {
  ensureSoftPadTexture,
  fadeSlideIn,
  floatNumber,
  oxygenBubbles,
  pulseDoorGlow,
  sparkBurst,
  stormImpactFx,
} from "../anim";
import { ChipTray } from "../ui/ChipTray";
import { PlaceHud } from "../ui/PlaceHud";
import { CrewTalk } from "../ui/CrewTalk";
import { JobStation } from "../ui/JobStation";
import { NasaFrame } from "../ui/NasaFrame";
import { GuideCoach } from "../ui/GuideCoach";
import { NovaGuide } from "../ui/NovaGuide";
import { ConsequenceOverlay } from "../ui/ConsequenceOverlay";
import { DragController } from "../drag/DragController";
import { THEME } from "../theme";
import type { PlaceId } from "../crewLines";
import { listArchivedOsdrStudies } from "../../data/osdr";
import {
  advanceTutorial,
  countSheltered,
  getCrewShelter,
  getTutorial,
  isTutorialActive,
  resetTutorialForDay,
} from "../tutorial/session";

type RoomId = "home" | "greenhouse" | "lab";

/**
 * Indoor rooms — tap places, drag chips/water; Nova coaches from the corner.
 */
export class IndoorScene extends Phaser.Scene {
  private room: RoomId = "home";
  private stations: JobStation[] = [];
  private drag!: DragController;
  private guide!: NovaGuide;
  private ending = false;
  private chipTray!: ChipTray;
  private crewTalk!: CrewTalk;
  private exitDoor = { x: 0, y: 0, r: 32 };
  private doorCooldown = 0;
  private fills: Record<string, number> = {};
  /** Greenhouse: plants watered this day (before grow light). */
  private plantsWatered = false;
  private growLightOn = false;
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;
  private clipboardOpen = false;
  private clipboardPanel: Phaser.GameObjects.Container | null = null;
  private coach: GuideCoach | null = null;
  private recyclerPos = { x: 0, y: 0 };
  private bedPos = { x: 0, y: 0 };

  constructor() {
    super("indoor");
  }

  init(data: { room: RoomId }) {
    this.room = data.room ?? "home";
    this.ending = false;
    this.stations = [];
    this.fills = {};
    this.plantsWatered = Boolean(bridge().ready() && bridge().getDecisions().greenhouse);
    this.growLightOn = this.plantsWatered;
    this.doorCooldown = 350;
    this.clipboardOpen = false;
    this.clipboardPanel = null;
    this.bubbleTimer = null;
  }

  create() {
    const { width: W, height: H } = this.scale;
    fadeSlideIn(this, true);
    this.drag = new DragController(this);
    ensureSoftPadTexture(this);
    const bgKey =
      this.room === "home" ? "bunks" : this.room === "greenhouse" ? "greenhouseIn" : "labIn";
    this.cameras.main.setBackgroundColor(0x2a2218);
    // Soft-pixel room: painting carries the place; light grade only (no flat floor slab).
    this.add.image(W / 2, H / 2, bgKey).setDisplaySize(W, H).setDepth(0);
    this.add.rectangle(0, 0, W, H, 0xfff8ef, 0.08).setOrigin(0).setDepth(1);
    this.add
      .rectangle(0, H * 0.88, W, H * 0.12, 0x1a1410, 0.18)
      .setOrigin(0)
      .setDepth(2);

    this.add
      .text(W / 2, 8, roomTitle(this.room), {
        fontFamily: THEME.fontDisplay,
        fontSize: "16px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setDepth(60);

    if (this.room === "home") this.buildHome(W, H);
    if (this.room === "greenhouse") this.buildGreenhouse(W, H);
    if (this.room === "lab") this.buildLab(W, H);

    this.exitDoor = { x: W * 0.5, y: H * 0.9, r: 38 };
    const exitGlow = this.add
      .image(this.exitDoor.x, this.exitDoor.y, "softPad")
      .setDisplaySize(96, 40)
      .setTint(0xffe08a)
      .setAlpha(0.65)
      .setDepth(12)
      .setInteractive({ useHandCursor: true });
    pulseDoorGlow(this, exitGlow);
    exitGlow.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      this.leaveToSurface();
    });
    this.add
      .text(this.exitDoor.x, this.exitDoor.y - 22, "Tap · Surface", {
        fontFamily: THEME.fontDisplay,
        fontSize: "12px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(13);

    this.chipTray = new ChipTray(this, 10, 10);
    this.chipTray.setDrag(this.drag);
    this.guide = new NovaGuide(this, this.drag);
    const place = this.room as PlaceId;
    if (bridge().ready()) resetTutorialForDay(bridge().getDay());
    this.crewTalk = isTutorialActive()
      ? ({ isOpen: () => false } as CrewTalk)
      : new CrewTalk(this, place);
    this.coach = new GuideCoach(this);
    new PlaceHud(
      this,
      [
        { id: "surface", label: "Surface", go: () => this.leaveToSurface() },
        { id: "home", label: "Home", go: () => this.jumpRoom("home") },
        { id: "greenhouse", label: "Plants", go: () => this.jumpRoom("greenhouse") },
        { id: "lab", label: "Lab", go: () => this.jumpRoom("lab") },
      ],
      place,
    );

    if (this.room === "home") {
      this.guide.say("Drag chips onto Water cleaner. Drag me onto the bunk to end the day.");
    } else if (this.room === "greenhouse") {
      this.guide.say("Drag water from Tap onto trays, then chip the Grow light. Watch O₂ + science.");
    } else {
      this.guide.say("Chip the analyzer for science. Tap the OSDR notes for a real plant study.");
    }

    this.chipTray.refresh(true);
    for (const s of this.stations) s.refresh();
  }

  private jumpRoom(room: RoomId) {
    if (room === this.room) {
      this.guide.say(`You are already in ${roomTitle(room)}.`);
      return;
    }
    audio.play("door");
    this.cameras.main.fadeOut(100, 42, 34, 28);
    this.time.delayedCall(110, () => this.scene.start("indoor", { room }));
  }

  private leaveToSurface() {
    audio.play("door");
    this.cameras.main.fadeOut(100, 42, 34, 28);
    this.time.delayedCall(110, () => {
      this.scene.start("base", { spawnNear: this.room });
    });
  }

  private addStation(station: JobStation) {
    this.stations.push(station);
    this.drag.register(station);
  }

  private buildHome(W: number, H: number) {
    // Heat always on — display only
    this.addStation(
      new JobStation(this, {
        id: "heat",
        x: W * 0.18,
        y: H * 0.52,
        label: "Heat",
        costs: [{ icon: "⚡", value: -HEAT_COST }],
        benefits: [{ icon: "🌡", value: "safe" }],
        accept: "chip",
        artKey: "zap",
        artW: 36,
        artH: 36,
        getOn: () => true,
        onDrop: () => {
          this.say("Heat stays on every day (already paid).");
          return false;
        },
      }),
    );

    this.recyclerPos = { x: W * 0.38, y: H * 0.55 };
    this.bedPos = { x: W * 0.78, y: H * 0.68 };
    this.addStation(
      new JobStation(this, {
        id: "recycler",
        x: W * 0.38,
        y: H * 0.55,
        label: "Water cleaner",
        costs: [{ icon: "⚡", value: -RECYCLER_COST }],
        benefits: [
          {
            icon: "💧",
            value: `save ${WATER_USE_WITHOUT_RECYCLER - WATER_USE_WITH_RECYCLER}`,
          },
        ],
        accept: "chip",
        chipCost: RECYCLER_COST,
        artKey: "waterCleaner",
        artW: 56,
        artH: 48,
        getOn: () => bridge().getDecisions().recycler,
        getFill: () => this.fills.recycler ?? 0,
        onDrop: (p) => {
          const ok = this.fillChipJob(
            "recycler",
            RECYCLER_COST,
            p.amount,
            "recycler",
            "waterTrickle",
            W * 0.38,
            H * 0.48,
          );
          if (ok && bridge().getDecisions().recycler) {
            const tip = advanceTutorial("water_cleaner");
            this.guide.explainJob(
              tip ??
                `Cleaner ON (−${RECYCLER_COST} chips). Effect: uses ${WATER_USE_WITH_RECYCLER} water/day instead of ${WATER_USE_WITHOUT_RECYCLER}.`,
            );
          }
          return ok;
        },
      }),
    );

    this.addStation(
      new JobStation(this, {
        id: "air",
        x: W * 0.58,
        y: H * 0.55,
        label: "Air maker",
        costs: [{ icon: "⚡", value: -OXYGEN_MAKER_COST }],
        benefits: [{ icon: "O₂", value: OXYGEN_MAKER_GAIN }],
        accept: "chip",
        chipCost: OXYGEN_MAKER_COST,
        artKey: "airMaker",
        artW: 52,
        artH: 48,
        getOn: () => bridge().getDecisions().oxygenMaker,
        getFill: () => this.fills.air ?? 0,
        onDrop: (p) =>
          this.fillChipJob("air", OXYGEN_MAKER_COST, p.amount, "oxygenMaker", "airHiss", W * 0.58, H * 0.48),
      }),
    );

    this.addStation(
      new JobStation(this, {
        id: "bed",
        x: W * 0.78,
        y: H * 0.68,
        label: "Bed — end day",
        costs: [{ icon: "😴", value: "" }],
        benefits: [{ icon: "→", value: "night" }],
        accept: "nova",
        radius: 42,
        artKey: "bunkMarker",
        artW: 54,
        artH: 36,
        getOn: () => false,
        onDrop: () => {
          this.finishDay();
          return true;
        },
      }),
    );
  }

  private buildGreenhouse(W: number, H: number) {
    // Painting already shows plants — only soft drop pads + tap (no floating junk).
    const tap = this.add.container(W * 0.18, H * 0.62).setDepth(16);
    const spout = this.add
      .image(0, 0, this.textures.exists("bucketFull") ? "bucketFull" : "waterTap")
      .setDisplaySize(44, 52);
    const tapLabel = this.add
      .text(0, -34, "Tap", {
        fontFamily: THEME.fontDisplay,
        fontSize: "11px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);
    tap.add([spout, tapLabel]);
    tap.setSize(48, 56);
    tap.setInteractive(new Phaser.Geom.Rectangle(-24, -32, 48, 60), Phaser.Geom.Rectangle.Contains);
    tap.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      this.drag.begin({ kind: "water", amount: GREENHOUSE_WATER }, p.worldX, p.worldY, 0x3a7ca5);
    });

    this.addStation(
      new JobStation(this, {
        id: "trays",
        x: W * 0.46,
        y: H * 0.62,
        label: "Plant trays",
        costs: [{ icon: "💧", value: -GREENHOUSE_WATER }],
        benefits: [{ icon: "🌱", value: "grow" }],
        accept: "water",
        radius: 48,
        getOn: () => this.plantsWatered,
        onDrop: () => {
          if (this.plantsWatered) {
            this.say("Trays already watered.");
            return false;
          }
          this.plantsWatered = true;
          audio.play("waterTrickle");
          floatNumber(this, W * 0.46, H * 0.55, `💧−${GREENHOUSE_WATER}`, THEME.skyDeep);
          this.guide.explainJob(
            `Trays watered (−${GREENHOUSE_WATER} water). Next: chip the Grow light for O₂ + science.`,
          );
          this.tryEnableGreenhouse(W, H);
          this.afterJob();
          return true;
        },
      }),
    );

    this.addStation(
      new JobStation(this, {
        id: "light",
        x: W * 0.72,
        y: H * 0.58,
        label: "Grow light",
        costs: [{ icon: "⚡", value: -GREENHOUSE_COST }],
        benefits: [
          { icon: "O₂", value: GREENHOUSE_OXYGEN },
          { icon: "🔬", value: GREENHOUSE_SCIENCE },
        ],
        accept: "chip",
        chipCost: GREENHOUSE_COST,
        artKey: "growLight",
        artW: 64,
        artH: 28,
        getOn: () => this.growLightOn,
        onDrop: () => {
          if (!this.plantsWatered) {
            this.say("Water the plant trays first — drag from Tap.");
            return false;
          }
          if (this.growLightOn) {
            this.growLightOn = false;
            bridge().patchDecisions({ greenhouse: false });
            floatNumber(this, W * 0.72, H * 0.5, "Light off", THEME.inkSoft);
            this.guide.explainJob("Grow light OFF — no plant O₂ or science tonight.");
            this.afterJob();
            return true;
          }
          if (plannedPowerCost({ ...bridge().getDecisions(), greenhouse: true }) > bridge().getPowerToday()) {
            this.say("Not enough free chips — check the yellow tray.");
            return false;
          }
          this.growLightOn = true;
          bridge().patchDecisions({ greenhouse: true });
          audio.play("plantSparkle");
          sparkBurst(this, W * 0.72, H * 0.52, 0xffe08a);
          floatNumber(this, W * 0.72, H * 0.5, `O₂+${GREENHOUSE_OXYGEN} 🔬+${GREENHOUSE_SCIENCE}`, THEME.sageInk);
          this.guide.explainJob(
            `Grow light ON (−${GREENHOUSE_COST} chip). Effect tonight: O₂ +${GREENHOUSE_OXYGEN}, science +${GREENHOUSE_SCIENCE}.`,
          );
          this.afterJob();
          return true;
        },
      }),
    );
  }

  private tryEnableGreenhouse(W: number, H: number) {
    if (this.plantsWatered && this.growLightOn) {
      bridge().patchDecisions({ greenhouse: true });
      floatNumber(this, W * 0.5, H * 0.4, "Plants working!", THEME.sageInk);
    }
  }

  private buildLab(W: number, H: number) {
    const sciPts =
      bridge().ready() && bridge().getState().site === "plain"
        ? SCIENCE_POINTS_PLAIN
        : SCIENCE_POINTS_RIM;

    // Wall screen — NASA storm picture + plain warning
    new NasaFrame(this, W * 0.22, H * 0.42, true);
    const brief = this.add
      .text(W * 0.22, H * 0.58, "", {
        fontFamily: THEME.font,
        fontSize: "11px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 6, y: 4 },
        align: "center",
        wordWrap: { width: 170 },
      })
      .setOrigin(0.5, 0)
      .setDepth(56);
    // Lab screen only warns if radio had chips yesterday (same rule as HUD alerts).
    brief.setText(
      bridge().getCommsYesterday()
        ? bridge().getStormBrief() || "Radio was on — sky check clear for now."
        : "No warning — radio had no chips yesterday.",
    );

    // OSDR clipboard — soft pad + label (painting carries the desk)
    const clip = this.add.container(W * 0.78, H * 0.42).setDepth(56);
    const board = this.add
      .image(0, 0, "softPad")
      .setDisplaySize(88, 56)
      .setTint(0xf3ebe0)
      .setAlpha(0.85);
    const clipTitle = this.add
      .text(0, -8, "OSDR notes", {
        fontFamily: THEME.fontDisplay,
        fontSize: "11px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);
    const clipHint = this.add
      .text(0, 16, "tap", {
        fontFamily: THEME.font,
        fontSize: "10px",
        color: THEME.inkSoft,
      })
      .setOrigin(0.5);
    clip.add([board, clipTitle, clipHint]);
    clip.setSize(100, 70);
    clip.setInteractive(new Phaser.Geom.Rectangle(-50, -40, 100, 80), Phaser.Geom.Rectangle.Contains);
    clip.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      this.openOsdrClipboard(W, H);
    });

    this.addStation(
      new JobStation(this, {
        id: "analyzer",
        x: W * 0.5,
        y: H * 0.62,
        label: "Sample analyzer",
        costs: [{ icon: "⚡", value: -SCIENCE_COST_PER_LEVEL }],
        benefits: [{ icon: "🔬", value: `+${sciPts}` }],
        accept: "chip",
        chipCost: 1,
        artKey: this.textures.exists("terminal") ? "terminal" : "sampleAnalyzer",
        artW: 56,
        artH: 48,
        getOn: () => bridge().getDecisions().scienceLevel > 0,
        onDrop: () => {
          const d = bridge().getDecisions();
          const next = Math.min(SCIENCE_LEVEL_MAX, d.scienceLevel + 1);
          if (next === d.scienceLevel) {
            this.say("Analyzer full for today.");
            return false;
          }
          if (plannedPowerCost({ ...d, scienceLevel: next }) > bridge().getPowerToday()) {
            this.say("Not enough power chips.");
            return false;
          }
          bridge().patchDecisions({ scienceLevel: next });
          sparkBurst(this, W * 0.5, H * 0.55, 0x7ec8ff);
          floatNumber(this, W * 0.5, H * 0.52, `🔬+${sciPts}`, THEME.sageInk);
          this.guide.explainJob(
            `Analyzer run (−1 chip). Effect tonight: science +${sciPts}.`,
          );
          this.afterJob();
          return true;
        },
      }),
    );
  }

  private openOsdrClipboard(W: number, H: number) {
    if (this.clipboardOpen) {
      this.clipboardPanel?.destroy(true);
      this.clipboardPanel = null;
      this.clipboardOpen = false;
      return;
    }
    const study =
      bridge().getOsdrStudy() ??
      listArchivedOsdrStudies().find((s) => s.id === "OSD-476") ??
      listArchivedOsdrStudies()[0]!;
    const finding = study.finding;
    const note = "ISS and lab results may differ on the Moon.";
    const panel = this.add.container(W / 2, H * 0.48).setDepth(120);
    const bg = this.add
      .rectangle(0, 0, 420, 200, THEME.panel, 0.98)
      .setStrokeStyle(3, THEME.line, 0.35);
    const title = this.add
      .text(0, -78, `${study.id} · real NASA finding`, {
        fontFamily: THEME.fontDisplay,
        fontSize: "14px",
        color: THEME.ink,
      })
      .setOrigin(0.5);
    const body = this.add
      .text(0, -20, finding, {
        fontFamily: THEME.font,
        fontSize: "13px",
        color: THEME.ink,
        align: "center",
        wordWrap: { width: 380 },
      })
      .setOrigin(0.5);
    const foot = this.add
      .text(0, 55, note, {
        fontFamily: THEME.font,
        fontSize: "12px",
        color: THEME.rose,
        align: "center",
        wordWrap: { width: 380 },
      })
      .setOrigin(0.5);
    const close = this.add
      .text(0, 82, "tap to close", {
        fontFamily: THEME.font,
        fontSize: "11px",
        color: THEME.inkSoft,
      })
      .setOrigin(0.5);
    panel.add([bg, title, body, foot, close]);
    panel.setSize(420, 200);
    panel.setInteractive(new Phaser.Geom.Rectangle(-210, -100, 420, 200), Phaser.Geom.Rectangle.Contains);
    panel.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      panel.destroy(true);
      this.clipboardPanel = null;
      this.clipboardOpen = false;
    });
    this.clipboardPanel = panel;
    this.clipboardOpen = true;
    audio.play("uiClick");
  }

  private fillChipJob(
    fillId: string,
    need: number,
    amount: number,
    decisionKey: "recycler" | "oxygenMaker",
    sfx: "waterTrickle" | "airHiss",
    fxX: number,
    fxY: number,
  ): boolean {
    const d = bridge().getDecisions();
    const currentlyOn = Boolean(d[decisionKey]);
    if (currentlyOn) {
      bridge().patchDecisions({ [decisionKey]: false });
      this.fills[fillId] = 0;
      this.bubbleTimer?.remove(false);
      this.bubbleTimer = null;
      floatNumber(this, fxX, fxY, "OFF", THEME.inkSoft);
      this.afterJob();
      return true;
    }
    const nextFill = Math.min(need, (this.fills[fillId] ?? 0) + amount);
    // Afford check as if turning on
    if (nextFill >= need) {
      if (plannedPowerCost({ ...d, [decisionKey]: true }) > bridge().getPowerToday()) {
        this.say("Not enough power chips.");
        return false;
      }
      this.fills[fillId] = 0;
      bridge().patchDecisions({ [decisionKey]: true });
      audio.play(sfx);
      sparkBurst(this, fxX, fxY);
      if (decisionKey === "oxygenMaker") {
        this.bubbleTimer?.remove(false);
        this.bubbleTimer = oxygenBubbles(this, fxX, fxY, true);
        floatNumber(this, fxX, fxY, `O₂+${OXYGEN_MAKER_GAIN}`, THEME.sageInk);
        this.guide.explainJob(
          `Air maker ON (−${OXYGEN_MAKER_COST} chips). Effect tonight: O₂ +${OXYGEN_MAKER_GAIN}.`,
        );
      } else {
        floatNumber(this, fxX, fxY, "Water cleaner ON", THEME.skyDeep);
      }
      this.afterJob();
      return true;
    }
    this.fills[fillId] = nextFill;
    floatNumber(this, fxX, fxY, `${nextFill}/${need}`, THEME.inkSoft);
    this.guide.say(`Need ${need - nextFill} more chip(s) on this machine.`);
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
    this.guide.say(msg);
  }

  private finishDay() {
    if (this.ending || !bridge().ready()) return;
    this.ending = true;
    const tip = advanceTutorial("bed");
    this.guide.explainJob(tip ?? "Night falls — watch what each job changed.");
    bridge().patchDecisions({
      shelteredCrewCount: countSheltered(getCrewShelter()),
    });
    audio.play("door");
    const event = bridge().getEvent();
    const isStorm = event?.stormSeverity !== undefined;
    if (isStorm) {
      audio.play("stormHit");
      stormImpactFx(this);
      const n = countSheltered(getCrewShelter());
      this.say(
        n >= 3
          ? "Whole crew inside. Safer tonight."
          : n > 0
            ? `${n}/3 sheltered — others take more storm risk.`
            : "Nobody sheltered. Risk went up.",
      );
      if (n > 0) audio.play("shelterClose");
    }
    this.time.delayedCall(isStorm ? 500 : 120, () => {
      const deltas = bridge().endDay();
      audio.play("dayEnd");
      new ConsequenceOverlay(this, deltas, () => {
        bridge().continueAfterResult();
        if (bridge().getMode() === "ending") return;
        this.scene.start("base");
      });
    });
  }

  update(_t: number, dt: number) {
    if (!bridge().ready()) return;
    if (this.doorCooldown > 0) this.doorCooldown -= dt;
    if (this.ending || this.crewTalk?.isOpen() || this.clipboardOpen) return;

    this.chipTray.setHeldExtra(this.heldTotal());
    this.chipTray.refresh(false);
    this.guide.syncFromBridge();

    const roomHint =
      this.room === "home"
        ? "home"
        : this.room === "greenhouse"
          ? "greenhouse"
          : "lab";
    this.coach?.sync(
      getTutorial(),
      {
        recycler: this.recyclerPos,
        bed: this.bedPos,
        home_door: this.exitDoor,
      },
      roomHint,
    );
  }
}

function roomTitle(room: RoomId) {
  if (room === "home") return "Crew home · Sam";
  if (room === "greenhouse") return "Greenhouse · Mira";
  return "Science lab · Dr. Ana";
}
