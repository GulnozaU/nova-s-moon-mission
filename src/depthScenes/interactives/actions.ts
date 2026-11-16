import type { DayDecisions } from "../../engine/types";
import type { GameState } from "../../types";
import {
  CLEAN_FILTER_MATERIAL_COST,
  CLEAN_FILTER_POWER_COST,
  COMMS_COST,
  GREENHOUSE_COST,
  OXYGEN_MAKER_COST,
  RECYCLER_COST,
  SCIENCE_COST_PER_LEVEL,
  SCIENCE_LEVEL_MAX,
  SHIELD_MATERIAL_COST,
  SHIELD_LEVEL_MAX,
} from "../../engine/constants";
import { plannedPowerCost } from "../../ui/powerMath";
import type { DragPayload, InteractiveDef, PlaceFx } from "./types";

export type ActionCtx = {
  def: InteractiveDef;
  payload?: DragPayload | null;
  decisions: DayDecisions;
  state: GameState;
  powerToday: number;
  fx: PlaceFx;
  near: boolean;
};

export type ActionResult = {
  ok: boolean;
  message: string;
  patch?: Partial<DayDecisions>;
  fx?: Partial<PlaceFx>;
  endDay?: boolean;
  goPlace?: "home" | "greenhouse" | "lab" | "surface";
  infoOverride?: string;
};

function freePower(d: DayDecisions, powerToday: number): number {
  return Math.max(0, powerToday - plannedPowerCost(d));
}

function canSpend(d: DayDecisions, powerToday: number, extra: number): boolean {
  return freePower(d, powerToday) >= extra;
}

export function runInteractive(ctx: ActionCtx): ActionResult {
  const { def, payload, decisions, state, powerToday, fx, near } = ctx;
  const id = def.id;

  if (def.kind === "drop" && !payload) {
    return { ok: false, message: `Drag ${def.accepts?.join(" / ") ?? "item"} here.` };
  }
  if (def.kind === "drop" && payload && def.accepts && !def.accepts.includes(payload.kind)) {
    return { ok: false, message: `That does not go on the ${def.label}.` };
  }
  if (def.kind === "use" && !near) {
    return { ok: false, message: `Walk closer to the ${def.label}.` };
  }

  // —— Surface ——
  if (id === "surface_door_home") return { ok: true, message: "Entering Crew home.", goPlace: "home" };
  if (id === "surface_door_gh")
    return { ok: true, message: "Entering Greenhouse.", goPlace: "greenhouse" };
  if (id === "surface_door_lab") return { ok: true, message: "Entering Science lab.", goPlace: "lab" };

  if (id === "surface_radio") {
    if (decisions.comms) return { ok: true, message: "Radio already on.", patch: {} };
    if (!canSpend(decisions, powerToday, COMMS_COST))
      return { ok: false, message: "Need 1 free chip for the radio." };
    return {
      ok: true,
      message: "Radio live — Mission Control can warn us.",
      patch: { comms: true },
    };
  }

  if (id === "surface_solar") {
    if (decisions.cleanFilter)
      return { ok: true, message: "Panels already cleaned today." };
    if (state.materials < CLEAN_FILTER_MATERIAL_COST)
      return { ok: false, message: "Need 1 material to clean panels." };
    if (!canSpend(decisions, powerToday, CLEAN_FILTER_POWER_COST))
      return { ok: false, message: "Need 1 free chip to clean panels." };
    return {
      ok: true,
      message: "Solar field cleaned — power stays steadier.",
      patch: { cleanFilter: true },
      fx: { tankPulse: fx.tankPulse + 1 },
    };
  }

  if (id === "surface_rover") {
    if (fx.roverTrip) return { ok: false, message: "Rover is still out." };
    const nextLv = Math.min(SCIENCE_LEVEL_MAX, decisions.scienceLevel + 1);
    const need = SCIENCE_COST_PER_LEVEL;
    if (nextLv === decisions.scienceLevel)
      return { ok: false, message: "Science walks are full today." };
    if (!canSpend(decisions, powerToday, need))
      return { ok: false, message: "Need 1 free chip for the rover." };
    return {
      ok: true,
      message: "Rover rolling — samples coming back!",
      patch: { scienceLevel: nextLv },
      fx: { roverTrip: true, roverSamples: fx.roverSamples + 2 },
    };
  }

  if (id === "surface_shield") {
    if (decisions.buildShield)
      return { ok: true, message: "Already building a shield layer today." };
    const mats = state.materials + (fx.materialsHeld > 0 ? 0 : 0);
    if (mats < SHIELD_MATERIAL_COST && fx.materialsHeld < SHIELD_MATERIAL_COST)
      return { ok: false, message: "Pick up crates first (need 2)." };
    if (state.shieldLevel >= SHIELD_LEVEL_MAX)
      return { ok: false, message: "Shields are maxed." };
    return {
      ok: true,
      message: "Shield layer shimmering on!",
      patch: { buildShield: true },
      fx: {
        shieldPulse: fx.shieldPulse + 1,
        materialsHeld: Math.max(0, fx.materialsHeld - SHIELD_MATERIAL_COST),
      },
    };
  }

  if (id === "surface_crates") {
    return {
      ok: true,
      message: "Crates ready to drag onto the shield.",
      fx: { materialsHeld: fx.materialsHeld + SHIELD_MATERIAL_COST },
    };
  }

  if (id === "surface_tank") {
    return {
      ok: true,
      message: `Tank level: ${state.water} water.`,
      infoOverride: `Water tank reads ${state.water}. Bases store recycled water — every drop is planned.`,
      fx: { tankPulse: fx.tankPulse + 1 },
    };
  }

  if (id === "surface_storm_sky" || id === "lab_storm") {
    return {
      ok: true,
      message: def.info?.text ?? "Storm monitor.",
      infoOverride: def.info?.text,
    };
  }

  if (id === "surface_shelter" || id === "home_shelter") {
    const n = Math.min(3, (decisions.shelteredCrewCount ?? 0) + 1);
    return {
      ok: true,
      message: `Crew sheltered ${n}/3.`,
      patch: { shelteredCrewCount: n },
    };
  }

  // —— Home ——
  if (id === "home_recycler") {
    if (decisions.recycler) return { ok: true, message: "Water cleaner already on." };
    if (!canSpend(decisions, powerToday, RECYCLER_COST))
      return { ok: false, message: "Need 2 free chips." };
    return {
      ok: true,
      message: "Water cleaner humming.",
      patch: { recycler: true },
    };
  }

  if (id === "home_air") {
    if (decisions.oxygenMaker) return { ok: true, message: "Air maker already on." };
    if (!canSpend(decisions, powerToday, OXYGEN_MAKER_COST))
      return { ok: false, message: "Need 2 free chips." };
    return {
      ok: true,
      message: "Air maker hissing — more oxygen tonight.",
      patch: { oxygenMaker: true },
    };
  }

  if (id === "home_bunk") {
    return {
      ok: true,
      message: "Nova turns in. Day ends.",
      endDay: true,
      fx: { dayEnding: true },
    };
  }

  if (id === "home_locker") {
    return {
      ok: true,
      message: `Materials: ${state.materials}.`,
      infoOverride: `Locker holds ${state.materials} material crates for shields and repairs.`,
    };
  }

  if (id === "home_radio") {
    return {
      ok: true,
      message: decisions.comms
        ? "Mission Control online."
        : "Power the outdoor dish to hear Mission Control.",
      infoOverride: decisions.comms
        ? "Mission Control: stay safe, watch the storm clock."
        : def.info?.text,
    };
  }

  if (id === "home_breaker") {
    const free = freePower(decisions, powerToday);
    return {
      ok: true,
      message: `${free} free chips left today.`,
      infoOverride: `Breaker box: ${free} free chips of ${powerToday} today. Heat always costs some.`,
    };
  }

  // —— Greenhouse ——
  if (id.startsWith("gh_tray_")) {
    const idx = Number(id.slice(-1)) as 0 | 1 | 2 | 3;
    if (fx.waterHeld < 1) return { ok: false, message: "Fill drops at the water tap first." };
    const stage = [...fx.plantStage] as PlaceFx["plantStage"];
    const wilt = [...fx.plantWilt] as PlaceFx["plantWilt"];
    stage[idx] = Math.min(3, stage[idx] + 1);
    wilt[idx] = false;
    return {
      ok: true,
      message: `Tray ${String.fromCharCode(65 + idx)} grew to stage ${stage[idx]}.`,
      fx: {
        waterHeld: fx.waterHeld - 1,
        plantStage: stage,
        plantWilt: wilt,
        harvestReady: stage.some((s) => s >= 3),
      },
    };
  }

  if (id === "gh_tap") {
    return {
      ok: true,
      message: "Water drops ready — drag onto trays.",
      fx: { waterHeld: fx.waterHeld + 2 },
    };
  }

  if (id === "gh_light") {
    if (decisions.greenhouse) return { ok: true, message: "Grow light already on." };
    if (!canSpend(decisions, powerToday, GREENHOUSE_COST))
      return { ok: false, message: "Need 1 free chip." };
    const stage = fx.plantStage.map((s) => Math.min(3, s + (s > 0 ? 1 : 0))) as PlaceFx["plantStage"];
    return {
      ok: true,
      message: "Grow light on — plants drink light.",
      patch: { greenhouse: true },
      fx: { growLightOn: true, plantStage: stage },
    };
  }

  if (id === "gh_harvest") {
    if (!fx.harvestReady && !fx.plantStage.some((s) => s >= 2))
      return { ok: false, message: "Plants are not ready yet." };
    return {
      ok: true,
      message: "Harvest packed — good science later.",
      fx: { harvestReady: false },
    };
  }

  if (id === "gh_compost") {
    return { ok: true, message: "Scraps go back into the soil cycle." };
  }

  // —— Lab ——
  if (id === "lab_analyzer") {
    if (payload?.kind === "sample" || fx.samplesHeld > 0) {
      if (!canSpend(decisions, powerToday, SCIENCE_COST_PER_LEVEL))
        return { ok: false, message: "Need 1 free chip to run the analyzer." };
      const nextLv = Math.min(SCIENCE_LEVEL_MAX, decisions.scienceLevel + 1);
      return {
        ok: true,
        message: "Samples → science!",
        patch: { scienceLevel: nextLv },
        fx: {
          analyzerGlow: true,
          samplesHeld: Math.max(0, fx.samplesHeld - 1),
        },
      };
    }
    if (payload?.kind === "chip") {
      if (fx.samplesHeld < 1 && fx.roverSamples < 1)
        return { ok: false, message: "Load samples from the rack first." };
      if (!canSpend(decisions, powerToday, SCIENCE_COST_PER_LEVEL))
        return { ok: false, message: "Need 1 free chip." };
      const nextLv = Math.min(SCIENCE_LEVEL_MAX, decisions.scienceLevel + 1);
      return {
        ok: true,
        message: "Analyzer whirring — science up!",
        patch: { scienceLevel: nextLv },
        fx: {
          analyzerGlow: true,
          samplesHeld: Math.max(0, fx.samplesHeld - 1),
          roverSamples: Math.max(0, fx.roverSamples - 1),
        },
      };
    }
    return { ok: false, message: "Drop a chip or a sample here." };
  }

  if (id === "lab_rack") {
    if (fx.roverSamples < 1)
      return { ok: false, message: "Send the rover out first for samples." };
    return {
      ok: true,
      message: "Samples loaded on the rack.",
      fx: {
        samplesHeld: fx.samplesHeld + fx.roverSamples,
        roverSamples: 0,
      },
    };
  }

  if (id === "lab_drawer") {
    return {
      ok: true,
      message: "Sample dish ready.",
      fx: { samplesHeld: fx.samplesHeld + 1 },
    };
  }

  if (id === "lab_micro" || id === "lab_tele") {
    return { ok: true, message: def.info?.text ?? def.label, infoOverride: def.info?.text };
  }

  // Generic INFO
  if (def.kind === "info" || def.info) {
    return {
      ok: true,
      message: def.info?.text ?? def.label,
      infoOverride: def.info?.text,
    };
  }

  return { ok: true, message: def.label };
}

export function defaultPlaceFx(): PlaceFx {
  return {
    roverTrip: false,
    roverSamples: 0,
    plantStage: [0, 0, 0, 0],
    plantWilt: [false, false, false, false],
    shieldPulse: 0,
    tankPulse: 0,
    analyzerGlow: false,
    growLightOn: false,
    waterHeld: 0,
    samplesHeld: 0,
    materialsHeld: 0,
    harvestReady: false,
    dayEnding: false,
  };
}
