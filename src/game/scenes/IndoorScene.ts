import Phaser from "phaser";
import { audio } from "../../audio/audio";
import { bridge } from "../bridge";
import { applyMovement, makeKeys, type ControlKeys } from "../playerControls";
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
  addShadow,
  dustPuff,
  fadeSlideIn,
  floatNumber,
  idleBreathe,
  oxygenBubbles,
  setPlantStage,
  sparkBurst,
  stormImpactFx,
  walkHop,
} from "../anim";
import { ChipTray } from "../ui/ChipTray";
import { PlaceHud } from "../ui/PlaceHud";
import { CrewTalk } from "../ui/CrewTalk";
import { JobStation } from "../ui/JobStation";
import { NasaFrame } from "../ui/NasaFrame";
import { GuideCoach } from "../ui/GuideCoach";
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
 * Compact indoor rooms — drag chips / water / Nova onto jobs.
 */
export class IndoorScene extends Phaser.Scene {
  private room: RoomId = "home";
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys: ControlKeys | null = null;
  private stations: JobStation[] = [];
  private drag!: DragController;
  private shadowSync!: () => void;
  private walkSync!: () => void;
  private walkTarget: { x: number; y: number } | null = null;
  private lastFootstep = 0;
  private novaBubble!: Phaser.GameObjects.Text;
  private plantLeaves: Phaser.GameObjects.Ellipse[] = [];
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
  private traysPos = { x: 0, y: 0 };
  private analyzerPos = { x: 0, y: 0 };
  private bedPos = { x: 0, y: 0 };

  constructor() {
    super("indoor");
  }

  init(data: { room: RoomId }) {
    this.room = data.room ?? "home";
    this.ending = false;
    this.stations = [];
    this.plantLeaves = [];
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
    const bgKey =
      this.room === "home" ? "bunks" : this.room === "greenhouse" ? "greenhouseIn" : "labIn";
    this.cameras.main.setBackgroundColor(0x1a1410);
    this.add.rectangle(0, 0, W, H, 0x2a2218).setOrigin(0).setDepth(0);
    this.add.image(W / 2, H / 2, bgKey).setDisplaySize(W, H).setAlpha(0.34).setDepth(1);
    this.add.rectangle(W / 2, H * 0.72, W, H * 0.45, 0x3a3228, 0.7).setDepth(2);

    this.add
      .text(W / 2, 8, roomTitle(this.room), {
        fontFamily: THEME.fontDisplay,
        fontSize: "18px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setDepth(60);

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
      .setDepth(60);

    if (this.room === "home") this.buildHome(W, H);
    if (this.room === "greenhouse") this.buildGreenhouse(W, H);
    if (this.room === "lab") this.buildLab(W, H);

    this.exitDoor = { x: W * 0.5, y: H * 0.88, r: 34 };
    this.add
      .rectangle(this.exitDoor.x, this.exitDoor.y, 70, 28, 0x5a4030, 0.95)
      .setStrokeStyle(2, 0xffe08a, 0.85)
      .setDepth(12);
    this.add
      .text(this.exitDoor.x, this.exitDoor.y, "EXIT → surface", {
        fontFamily: THEME.fontDisplay,
        fontSize: "11px",
        color: THEME.cream,
      })
      .setOrigin(0.5)
      .setDepth(13);

    this.player = this.physics.add
      .sprite(W * 0.5, H * 0.62, "nova")
      .setDisplaySize(48, 64)
      .setCollideWorldBounds(true)
      .setDepth(20);
    this.player.body!.setSize(24, 18);
    this.player.body!.setOffset(14, 44);
    this.physics.world.setBounds(40, H * 0.4, W - 80, H * 0.48);

    if (this.room === "home") {
      this.player.setInteractive({ useHandCursor: true });
      this.player.on("pointerdown", (p: Phaser.Input.Pointer) => {
        p.event.stopPropagation();
        this.drag.begin({ kind: "nova", amount: 1 }, p.worldX, p.worldY);
      });
    }

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
      if (this.ending || this.crewTalk?.isOpen() || this.drag.dragging || this.clipboardOpen) return;
      this.walkTarget = {
        x: p.worldX,
        y: Phaser.Math.Clamp(p.worldY, H * 0.42, H * 0.86),
      };
    });

    this.chipTray = new ChipTray(this);
    this.chipTray.setDrag(this.drag);
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

    this.chipTray.refresh(true);
    for (const s of this.stations) s.refresh();
    this.syncPlants();
  }

  private jumpRoom(room: RoomId) {
    if (room === this.room) {
      this.walkTarget = { x: this.scale.width * 0.5, y: this.scale.height * 0.62 };
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
            advanceTutorial("water_cleaner");
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
        getOn: () => false,
        onDrop: () => {
          this.finishDay();
          return true;
        },
      }),
    );
  }

  private buildGreenhouse(W: number, H: number) {
    for (let i = 0; i < 3; i++) {
      const x = W * (0.32 + i * 0.14);
      const y = H * 0.5;
      const leaf = this.add.ellipse(x, y, 28, 34, 0x8a6a3a).setDepth(8);
      this.add.rectangle(x, y + 20, 20, 12, 0x6b4a2a).setDepth(8);
      this.plantLeaves.push(leaf);
    }

    // Tap — spawn water drops
    const tap = this.add.container(W * 0.16, H * 0.48).setDepth(16);
    const spout = this.add.rectangle(0, 0, 18, 28, 0x6a8a9a, 0.95).setStrokeStyle(2, THEME.line, 0.35);
    const dropIcon = this.add.text(0, 18, "💧", { fontSize: "16px" }).setOrigin(0.5);
    const tapLabel = this.add
      .text(0, -28, "Tap", {
        fontFamily: THEME.fontDisplay,
        fontSize: "11px",
        color: THEME.ink,
        backgroundColor: THEME.cream,
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);
    tap.add([spout, dropIcon, tapLabel]);
    tap.setSize(40, 50);
    tap.setInteractive(new Phaser.Geom.Rectangle(-20, -30, 40, 55), Phaser.Geom.Rectangle.Contains);
    tap.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      this.drag.begin({ kind: "water", amount: GREENHOUSE_WATER }, p.worldX, p.worldY, 0x3a7ca5);
    });

    this.traysPos = { x: W * 0.46, y: H * 0.62 };
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
          this.tryEnableGreenhouse(W, H);
          this.syncPlants();
          advanceTutorial("greenhouse_water");
          this.afterJob();
          return true;
        },
      }),
    );

    this.addStation(
      new JobStation(this, {
        id: "light",
        x: W * 0.72,
        y: H * 0.52,
        label: "Grow light",
        costs: [{ icon: "⚡", value: -GREENHOUSE_COST }],
        benefits: [
          { icon: "O₂", value: GREENHOUSE_OXYGEN },
          { icon: "🔬", value: GREENHOUSE_SCIENCE },
        ],
        accept: "chip",
        chipCost: GREENHOUSE_COST,
        getOn: () => this.growLightOn,
        onDrop: () => {
          if (!this.plantsWatered) {
            this.say("Water the plant trays first.");
            return false;
          }
          if (this.growLightOn) {
            this.growLightOn = false;
            bridge().patchDecisions({ greenhouse: false });
            floatNumber(this, W * 0.72, H * 0.44, "Light off", THEME.inkSoft);
            this.syncPlants();
            this.afterJob();
            return true;
          }
          if (plannedPowerCost({ ...bridge().getDecisions(), greenhouse: true }) > bridge().getPowerToday()) {
            this.say("Not enough power chips.");
            return false;
          }
          this.growLightOn = true;
          bridge().patchDecisions({ greenhouse: true });
          audio.play("plantSparkle");
          sparkBurst(this, W * 0.72, H * 0.48, 0xffe08a);
          floatNumber(this, W * 0.72, H * 0.44, `O₂+${GREENHOUSE_OXYGEN} 🔬+${GREENHOUSE_SCIENCE}`, THEME.sageInk);
          this.syncPlants();
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

    // OSDR clipboard
    const clip = this.add.container(W * 0.78, H * 0.4).setDepth(56);
    const board = this.add
      .rectangle(0, 0, 100, 120, 0xf3ebe0, 0.98)
      .setStrokeStyle(2, THEME.line, 0.35);
    const clipTitle = this.add
      .text(0, -48, "OSDR clipboard", {
        fontFamily: THEME.fontDisplay,
        fontSize: "11px",
        color: THEME.ink,
      })
      .setOrigin(0.5);
    const clipHint = this.add
      .text(0, 40, "tap to open", {
        fontFamily: THEME.font,
        fontSize: "10px",
        color: THEME.inkSoft,
      })
      .setOrigin(0.5);
    clip.add([board, clipTitle, clipHint]);
    clip.setSize(100, 120);
    clip.setInteractive(new Phaser.Geom.Rectangle(-50, -60, 100, 120), Phaser.Geom.Rectangle.Contains);
    clip.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      this.openOsdrClipboard(W, H);
    });

    this.analyzerPos = { x: W * 0.5, y: H * 0.62 };
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
          advanceTutorial("lab_analyzer");
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
      } else {
        floatNumber(this, fxX, fxY, "Water cleaner ON", THEME.skyDeep);
      }
      this.afterJob();
      return true;
    }
    this.fills[fillId] = nextFill;
    floatNumber(this, fxX, fxY, `${nextFill}/${need}`, THEME.inkSoft);
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

  private syncPlants() {
    const stage = !this.plantsWatered && !this.growLightOn
      ? 0
      : this.plantsWatered && !this.growLightOn
        ? 1
        : this.plantsWatered && this.growLightOn
          ? 3
          : 2;
    for (const leaf of this.plantLeaves) setPlantStage(leaf, stage);
  }

  private say(msg: string) {
    bridge().setNovaLine(msg);
    this.novaBubble.setText(msg);
  }

  private finishDay() {
    if (this.ending || !bridge().ready()) return;
    this.ending = true;
    this.walkTarget = null;
    this.player.setVelocity(0, 0);
    advanceTutorial("bed");
    // Persist storm crew shelter count into today's decisions.
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
    if (!this.player?.body || !bridge().ready()) return;
    if (this.doorCooldown > 0) this.doorCooldown -= dt;
    if (this.ending || this.crewTalk?.isOpen() || this.drag.dragging || this.clipboardOpen) {
      this.player.setVelocity(0, 0);
      return;
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

    if (
      this.doorCooldown <= 0 &&
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.exitDoor.x,
        this.exitDoor.y,
      ) < this.exitDoor.r
    ) {
      this.doorCooldown = 500;
      this.leaveToSurface();
      return;
    }

    this.chipTray.setHeldExtra(this.heldTotal());
    this.chipTray.refresh(false);

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
        tap_water: this.traysPos,
        analyzer: this.analyzerPos,
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
