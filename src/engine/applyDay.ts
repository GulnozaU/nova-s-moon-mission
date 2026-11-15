import {
  BATTERY_CAP,
  COMMS_COST,
  GREENHOUSE_COST,
  GREENHOUSE_OXYGEN,
  GREENHOUSE_SCIENCE,
  GREENHOUSE_WATER,
  HEAT_COST,
  LOSE_EXPOSURE_AT,
  LOSE_OXYGEN_AT,
  LOSE_WATER_AT,
  MISSION_DAYS,
  OXYGEN_MAKER_COST,
  OXYGEN_MAKER_GAIN,
  OXYGEN_MAKER_WATER,
  OXYGEN_USE_PER_DAY,
  PANEL_MATERIAL_COST,
  RECYCLER_COST,
  SCIENCE_COST_PER_LEVEL,
  SCIENCE_LEVEL_MAX,
  SCIENCE_POINTS_PLAIN,
  SCIENCE_POINTS_RIM,
  SHIELD_LEVEL_MAX,
  SHIELD_MATERIAL_COST,
  UNPOWERED_HEAT_EXPOSURE,
  WATER_USE_WITHOUT_RECYCLER,
  WATER_USE_WITH_RECYCLER,
} from "./constants";
import { normalOutsideExposure, stormExposureDelta } from "./exposure";
import { availablePower, baseGeneration } from "./power";
import type { ApplyDayResult, DayDecisions, StormEvent } from "./types";
import type { DayLog, EventEffects, GameState } from "../types";

function clampScienceLevel(level: number): number {
  if (!Number.isFinite(level) || level < 0) return 0;
  return Math.min(SCIENCE_LEVEL_MAX, Math.floor(level));
}

function applyEffects(
  state: GameState,
  effects: EventEffects,
): { state: GameState; scienceThatDayOverride: number | undefined } {
  const next = { ...state };
  if (effects.water !== undefined) next.water += effects.water;
  if (effects.oxygen !== undefined) next.oxygen += effects.oxygen;
  if (effects.materials !== undefined) next.materials += effects.materials;
  if (effects.battery !== undefined) next.battery += effects.battery;
  if (effects.science !== undefined) next.science += effects.science;
  if (effects.exposure !== undefined) next.exposure += effects.exposure;
  if (effects.shieldLevel !== undefined) {
    next.shieldLevel = Math.max(
      0,
      Math.min(SHIELD_LEVEL_MAX, next.shieldLevel + effects.shieldLevel),
    );
  }
  if (effects.panelBonus !== undefined) {
    next.panelBonus = Math.max(0, next.panelBonus + effects.panelBonus);
  }
  if (effects.recyclerEfficiency !== undefined) {
    next.recyclerEfficiency = Math.max(
      0,
      Math.min(1, effects.recyclerEfficiency),
    );
  }
  next.battery = Math.min(BATTERY_CAP, Math.max(0, next.battery));
  return {
    state: next,
    scienceThatDayOverride: effects.scienceThatDay,
  };
}

function isLost(state: GameState): boolean {
  return (
    state.water <= LOSE_WATER_AT ||
    state.oxygen <= LOSE_OXYGEN_AT ||
    state.exposure >= LOSE_EXPOSURE_AT
  );
}

/**
 * Resolve one mission day. Pure: no UI, no network.
 * Heat is forced. Unspent power returns to the battery (cap 20).
 */
export function applyDay(
  state: GameState,
  decisions: DayDecisions,
  event: StormEvent,
  choice: "A" | "B",
  rng?: () => number,
): ApplyDayResult {
  const notes: string[] = [];
  const scienceLevel = clampScienceLevel(decisions.scienceLevel);
  const greenhouse = Boolean(decisions.greenhouse);
  const option = choice === "A" ? event.optionA : event.optionB;
  const sheltered = Boolean(option.effects.sheltered);

  let battery = state.battery;
  const generation =
    baseGeneration(state.site, state.day) + state.panelBonus;
  let pool = availablePower(
    state.site,
    state.day,
    state.panelBonus,
    state.battery,
  );
  // Battery is emptied into the day's pool; leftovers are re-stored later.
  battery = 0;

  notes.push(
    `Day ${state.day}: ${generation} generated + prior battery → ${pool} chips`,
  );

  // --- Forced heat ---
  let heatPowered = false;
  if (pool >= HEAT_COST) {
    pool -= HEAT_COST;
    heatPowered = true;
  } else {
    notes.push("Heat unpowered — crew safety suffers.");
  }

  // --- Optional systems (skip if not enough chips left) ---
  let recyclerOn = false;
  let oxygenMakerOn = false;
  let commsOn = false;
  let scienceLevelsRun = 0;
  let greenhouseOn = false;

  if (decisions.recycler && pool >= RECYCLER_COST) {
    pool -= RECYCLER_COST;
    recyclerOn = true;
  } else if (decisions.recycler) {
    notes.push("Recycler skipped — not enough power.");
  }

  if (decisions.oxygenMaker && pool >= OXYGEN_MAKER_COST) {
    pool -= OXYGEN_MAKER_COST;
    oxygenMakerOn = true;
  } else if (decisions.oxygenMaker) {
    notes.push("Oxygen maker skipped — not enough power.");
  }

  if (decisions.comms && pool >= COMMS_COST) {
    pool -= COMMS_COST;
    commsOn = true;
  } else if (decisions.comms) {
    notes.push("Comms skipped — not enough power.");
  }

  const scienceAffordable = Math.min(
    scienceLevel,
    Math.floor(pool / SCIENCE_COST_PER_LEVEL),
  );
  if (scienceAffordable > 0) {
    pool -= scienceAffordable * SCIENCE_COST_PER_LEVEL;
    scienceLevelsRun = scienceAffordable;
  }
  if (scienceLevel > scienceAffordable) {
    notes.push("Science levels cut — not enough power.");
  }

  if (greenhouse && pool >= GREENHOUSE_COST) {
    pool -= GREENHOUSE_COST;
    greenhouseOn = true;
  } else if (greenhouse) {
    notes.push("Greenhouse skipped — not enough power.");
  }

  // Unspent chips → battery (cap 20)
  battery = Math.min(BATTERY_CAP, pool);
  if (pool > BATTERY_CAP) {
    notes.push(`Battery full — discarded ${pool - BATTERY_CAP} chips.`);
  }

  // --- Materials builds ---
  let materials = state.materials;
  let shieldLevel = state.shieldLevel;
  let panelBonus = state.panelBonus;

  if (decisions.buildShield) {
    if (
      materials >= SHIELD_MATERIAL_COST &&
      shieldLevel < SHIELD_LEVEL_MAX
    ) {
      materials -= SHIELD_MATERIAL_COST;
      shieldLevel += 1;
      notes.push(`Built shield level ${shieldLevel}.`);
    } else {
      notes.push("Could not build shield (materials or cap).");
    }
  }

  if (decisions.buildPanel) {
    if (materials >= PANEL_MATERIAL_COST) {
      materials -= PANEL_MATERIAL_COST;
      panelBonus += 1;
      notes.push("Built a solar panel (+1 power/day).");
    } else {
      notes.push("Could not build panel (materials).");
    }
  }

  // --- Water / oxygen ---
  let water = state.water;
  let oxygen = state.oxygen;

  const efficiency = state.recyclerEfficiency ?? 1;
  const waterUse = recyclerOn
    ? WATER_USE_WITHOUT_RECYCLER -
      (WATER_USE_WITHOUT_RECYCLER - WATER_USE_WITH_RECYCLER) * efficiency
    : WATER_USE_WITHOUT_RECYCLER;
  water -= waterUse;
  if (oxygenMakerOn) {
    water -= OXYGEN_MAKER_WATER;
    oxygen += OXYGEN_MAKER_GAIN;
  }
  if (greenhouseOn) {
    water -= GREENHOUSE_WATER;
    oxygen += GREENHOUSE_OXYGEN;
  }
  oxygen -= OXYGEN_USE_PER_DAY;

  // --- Science points ---
  const pointsPerLevel =
    state.site === "rim" ? SCIENCE_POINTS_RIM : SCIENCE_POINTS_PLAIN;
  let scienceGain = sheltered ? 0 : scienceLevelsRun * pointsPerLevel;
  if (sheltered && scienceLevelsRun > 0) {
    notes.push("Sheltered — science that day is 0.");
  }
  if (greenhouseOn && !sheltered) {
    scienceGain += GREENHOUSE_SCIENCE;
  } else if (greenhouseOn && sheltered) {
    // Shelter zeroes science that day (SPEC 3.7), including greenhouse bonus.
    notes.push("Sheltered — greenhouse science cancelled.");
  }

  let science = state.science + scienceGain;
  let exposure = state.exposure;

  if (!heatPowered) {
    exposure += UNPOWERED_HEAT_EXPOSURE;
  }

  // --- Storm / normal outdoor exposure ---
  const severity = event.stormSeverity;
  if (severity !== undefined) {
    const delta = stormExposureDelta(severity, shieldLevel, sheltered);
    exposure += delta;
    notes.push(
      `Storm severity ${severity}: +${delta.toFixed(2)} exposure (${sheltered ? "sheltered" : "outside"}).`,
    );
  } else if (scienceLevelsRun > 0 && !sheltered) {
    const delta = normalOutsideExposure();
    exposure += delta;
    notes.push(`Outside for science: +${delta} exposure.`);
  }

  let next: GameState = {
    ...state,
    battery,
    water,
    oxygen,
    materials,
    shieldLevel,
    panelBonus,
    exposure,
    science,
  };

  let effects = { ...option.effects };
  if (
    effects.riskChance !== undefined &&
    effects.riskMaterials !== undefined &&
    rng &&
    rng() < effects.riskChance
  ) {
    effects = {
      ...effects,
      materials: (effects.materials ?? 0) + effects.riskMaterials,
    };
    notes.push(
      `Mistake risk hit — lost ${Math.abs(effects.riskMaterials)} materials.`,
    );
  }
  const applied = applyEffects(next, effects);
  next = applied.state;
  if (applied.scienceThatDayOverride !== undefined) {
    // effects.scienceThatDay replaces today's science gain if provided
    const withoutToday = state.science;
    next = {
      ...next,
      science: withoutToday + applied.scienceThatDayOverride,
    };
  }

  // Re-clamp battery after event effects
  next.battery = Math.min(BATTERY_CAP, Math.max(0, next.battery));

  const lost = isLost(next);
  const finishedMission = state.day >= MISSION_DAYS && !lost;
  const nextDay = lost || finishedMission ? state.day : state.day + 1;

  const dayLog: DayLog = {
    day: state.day,
    powerSpent: {
      heat: heatPowered ? HEAT_COST : 0,
      recycler: recyclerOn,
      oxygenMaker: oxygenMakerOn,
      comms: commsOn,
      scienceLevel: scienceLevelsRun,
      greenhouse: greenhouseOn,
    },
    eventId: event.id,
    choice,
    sheltered,
    battery: next.battery,
    water: next.water,
    oxygen: next.oxygen,
    materials: next.materials,
    shieldLevel: next.shieldLevel,
    panelBonus: next.panelBonus,
    exposure: next.exposure,
    science: next.science,
    notes,
  };

  const newState: GameState = {
    ...next,
    day: nextDay,
    log: [...state.log, dayLog],
  };

  return {
    state: newState,
    dayLog,
    lost,
    won: finishedMission,
  };
}

export function checkLost(state: GameState): boolean {
  return isLost(state);
}
