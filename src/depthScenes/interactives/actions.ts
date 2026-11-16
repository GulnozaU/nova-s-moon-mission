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

export function fillReserved(fills: Record<string, number>): number {
  let n = 0;
  for (const v of Object.values(fills)) n += v;
  return n;
}

export function freePower(
  d: DayDecisions,
  powerToday: number,
  fills: Record<string, number> = {},
): number {
  return Math.max(0, powerToday - plannedPowerCost(d) - fillReserved(fills));
}

function canSpend(
  d: DayDecisions,
  powerToday: number,
  extra: number,
  fills: Record<string, number> = {},
): boolean {
  return freePower(d, powerToday, fills) >= extra;
}

/** Drop chips until `need` — machine turns ON only when full (engine cost). */
function fillChipMachine(
  fillKey: string,
  need: number,
  decisionKey: "recycler" | "oxygenMaker" | "comms" | "greenhouse" | "cleanFilter",
  amount: number,
  decisions: DayDecisions,
  powerToday: number,
  fx: PlaceFx,
  onMsg: string,
  offMsg: string,
): ActionResult {
  const currentlyOn = Boolean(decisions[decisionKey]);
  if (currentlyOn) {
    const fills = { ...fx.fills, [fillKey]: 0 };
    return {
      ok: true,
      message: offMsg,
      patch: { [decisionKey]: false },
      fx: { fills },
    };
  }
  if (!canSpend(decisions, powerToday, amount, fx.fills)) {
    return { ok: false, message: "Not enough free chips." };
  }
  const nextFill = Math.min(need, (fx.fills[fillKey] ?? 0) + amount);
  if (nextFill >= need) {
    const trial = { ...decisions, [decisionKey]: true };
    if (plannedPowerCost(trial) > powerToday) {
      return { ok: false, message: "Not enough power chips for this machine." };
    }
    const fills = { ...fx.fills, [fillKey]: 0 };
    return {
      ok: true,
      message: onMsg,
      patch: { [decisionKey]: true },
      fx: { fills, growLightOn: decisionKey === "greenhouse" ? true : fx.growLightOn },
    };
  }
  return {
    ok: true,
    message: `${nextFill}/${need} chips in…`,
    fx: { fills: { ...fx.fills, [fillKey]: nextFill } },
  };
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
  if (id === "surface_door_home" && payload?.kind !== "crew" && payload?.kind !== "nova") {
    return { ok: true, message: "Entering Crew home.", goPlace: "home" };
  }
  if (id === "surface_door_gh")
    return { ok: true, message: "Entering Greenhouse.", goPlace: "greenhouse" };
  if (id === "surface_door_lab") return { ok: true, message: "Entering Science lab.", goPlace: "lab" };

  if (id === "surface_radio") {
    if (payload?.kind !== "chip" && !decisions.comms) {
      return { ok: false, message: "Drag a chip onto the radio." };
    }
    return fillChipMachine(
      "radio",
      COMMS_COST,
      "comms",
      payload?.amount ?? 1,
      decisions,
      powerToday,
      fx,
      "Radio live — Mission Control can warn us.",
      "Radio off.",
    );
  }

  if (id === "surface_solar") {
    if (state.materials < CLEAN_FILTER_MATERIAL_COST && !decisions.cleanFilter)
      return { ok: false, message: "Need 1 material to clean panels." };
    const r = fillChipMachine(
      "solar",
      CLEAN_FILTER_POWER_COST,
      "cleanFilter",
      payload?.amount ?? 1,
      decisions,
      powerToday,
      fx,
      "Solar field cleaned — power stays steadier.",
      "Cleaning cancelled.",
    );
    if (r.ok && r.patch?.cleanFilter) {
      return { ...r, fx: { ...r.fx, tankPulse: fx.tankPulse + 1 } };
    }
    return r;
  }

  if (id === "surface_rover") {
    if (fx.roverTrip) return { ok: false, message: "Rover is still out." };
    const nextLv = Math.min(SCIENCE_LEVEL_MAX, decisions.scienceLevel + 1);
    const need = SCIENCE_COST_PER_LEVEL;
    if (nextLv === decisions.scienceLevel)
      return { ok: false, message: "Science walks are full today." };
    if (!canSpend(decisions, powerToday, need, fx.fills))
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

  if (
    id === "surface_shelter" ||
    id === "home_shelter" ||
    id === "surface_door_home"
  ) {
    if (payload?.kind === "crew" || payload?.kind === "nova") {
      const sheltered = { ...fx.sheltered };
      const idKey = payload.crewId ?? "sam";
      sheltered[idKey] = true;
      // Also mark others if nova (Nova counts as leading one crew in)
      if (payload.kind === "nova") sheltered.sam = true;
      const n = Object.values(sheltered).filter(Boolean).length;
      return {
        ok: true,
        message: `Crew sheltered ${n}/3.`,
        patch: { shelteredCrewCount: n },
        fx: { sheltered },
        goPlace: id === "surface_door_home" ? "home" : undefined,
      };
    }
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
    return fillChipMachine(
      "recycler",
      RECYCLER_COST,
      "recycler",
      payload?.amount ?? 1,
      decisions,
      powerToday,
      fx,
      "Water cleaner humming.",
      "Water cleaner off.",
    );
  }

  if (id === "home_air") {
    return fillChipMachine(
      "air",
      OXYGEN_MAKER_COST,
      "oxygenMaker",
      payload?.amount ?? 1,
      decisions,
      powerToday,
      fx,
      "Air maker hissing — more oxygen tonight.",
      "Air maker off.",
    );
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
    const r = fillChipMachine(
      "greenhouse",
      GREENHOUSE_COST,
      "greenhouse",
      payload?.amount ?? 1,
      decisions,
      powerToday,
      fx,
      "Grow light on — plants drink light.",
      "Grow light off.",
    );
    if (r.ok && r.patch?.greenhouse) {
      const stage = fx.plantStage.map((s) =>
        Math.min(3, s + (s > 0 ? 1 : 0)),
      ) as PlaceFx["plantStage"];
      return {
        ...r,
        fx: { ...r.fx, growLightOn: true, plantStage: stage },
      };
    }
    return r;
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
    if (payload?.kind === "sample" || (payload?.kind === "chip" && (fx.samplesHeld > 0 || fx.roverSamples > 0))) {
      const fillKey = "analyzer";
      const need = SCIENCE_COST_PER_LEVEL;
      if (payload.kind === "sample") {
        // Sample alone arms the machine; still need chips to run.
        return {
          ok: true,
          message: "Sample loaded — drop a chip to run.",
          fx: {
            samplesHeld: Math.max(0, fx.samplesHeld),
            analyzerGlow: false,
            fills: { ...fx.fills, [fillKey]: fx.fills[fillKey] ?? 0 },
          },
        };
      }
      if (!canSpend(decisions, powerToday, need, fx.fills))
        return { ok: false, message: "Need 1 free chip to run the analyzer." };
      const nextFill = Math.min(need, (fx.fills[fillKey] ?? 0) + (payload.amount ?? 1));
      if (nextFill < need) {
        return {
          ok: true,
          message: `${nextFill}/${need} chips in…`,
          fx: { fills: { ...fx.fills, [fillKey]: nextFill } },
        };
      }
      const nextLv = Math.min(SCIENCE_LEVEL_MAX, decisions.scienceLevel + 1);
      const trial = { ...decisions, scienceLevel: nextLv };
      if (plannedPowerCost(trial) > powerToday)
        return { ok: false, message: "Not enough power chips." };
      return {
        ok: true,
        message: "Analyzer whirring — science up!",
        patch: { scienceLevel: nextLv },
        fx: {
          analyzerGlow: true,
          samplesHeld: Math.max(0, fx.samplesHeld - 1),
          roverSamples: Math.max(0, fx.roverSamples - 1),
          fills: { ...fx.fills, [fillKey]: 0 },
        },
      };
    }
    if (payload?.kind === "chip" && fx.samplesHeld < 1 && fx.roverSamples < 1)
      return { ok: false, message: "Load samples from the rack first." };
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
    fills: {},
    sheltered: { sam: false, mira: false, ana: false },
  };
}
