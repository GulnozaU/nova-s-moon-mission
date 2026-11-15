import {
  BATTERY_CAP,
  CLEAN_FILTER_MATERIAL_COST,
  CLEAN_FILTER_POWER_COST,
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
  UNSHIELDED_DAILY_EXPOSURE,
  WATER_USE_WITHOUT_RECYCLER,
  WATER_USE_WITH_RECYCLER,
} from "./constants";
import { normalOutsideExposure, stormExposureDelta } from "./exposure";
import { availablePower, baseGeneration } from "./power";
import type { ApplyDayResult, DayDecisions, StormEvent } from "./types";
import type { DayLog, EventEffects, GameState, PendingCost } from "../types";

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

function applyPendingDue(
  state: GameState,
  day: number,
  notes: string[],
): GameState {
  const due = state.pending.filter((p) => p.applyOnDay === day);
  const remaining = state.pending.filter((p) => p.applyOnDay !== day);
  if (due.length === 0) return { ...state, pending: remaining };

  let next = { ...state, pending: remaining };
  for (const cost of due) {
    if (cost.water) next.water += cost.water;
    if (cost.oxygen) next.oxygen += cost.oxygen;
    if (cost.materials) next.materials += cost.materials;
    if (cost.exposure) next.exposure += cost.exposure;
    if (cost.battery) {
      next.battery = Math.min(
        BATTERY_CAP,
        Math.max(0, next.battery + cost.battery),
      );
    }
    notes.push(cost.note);
  }
  return next;
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

  // Delayed costs from earlier choices land at the start of this day.
  let working = applyPendingDue(
    { ...state, pending: [...(state.pending ?? [])] },
    state.day,
    notes,
  );

  let battery = working.battery;
  const generation =
    baseGeneration(working.site, working.day) + working.panelBonus;
  let pool = availablePower(
    working.site,
    working.day,
    working.panelBonus,
    working.battery,
  );
  battery = 0;

  notes.push(
    `Day ${working.day}: ${generation} generated + prior battery → ${pool} chips`,
  );

  // --- Forced heat ---
  let heatPowered = false;
  if (pool >= HEAT_COST) {
    pool -= HEAT_COST;
    heatPowered = true;
  } else {
    notes.push("Heat unpowered — crew safety suffers.");
  }

  // --- Clean filter (before other optional systems) ---
  let recyclerEfficiency = working.recyclerEfficiency ?? 1;
  let materials = working.materials;
  if (
    decisions.cleanFilter &&
    recyclerEfficiency < 1 &&
    materials >= CLEAN_FILTER_MATERIAL_COST &&
    pool >= CLEAN_FILTER_POWER_COST
  ) {
    materials -= CLEAN_FILTER_MATERIAL_COST;
    pool -= CLEAN_FILTER_POWER_COST;
    recyclerEfficiency = 1;
    notes.push(
      `Cleaned the water filter (−${CLEAN_FILTER_MATERIAL_COST} material, −${CLEAN_FILTER_POWER_COST} power).`,
    );
  } else if (decisions.cleanFilter && recyclerEfficiency < 1) {
    notes.push("Could not clean the filter (need 1 material and 1 power).");
  }

  // --- Optional systems ---
  let recyclerOn = false;
  let oxygenMakerOn = false;
  let commsOn = false;
  let scienceLevelsRun = 0;
  let greenhouseOn = false;

  if (decisions.recycler && pool >= RECYCLER_COST) {
    pool -= RECYCLER_COST;
    recyclerOn = true;
  } else if (decisions.recycler) {
    notes.push("Water cleaner skipped — not enough power.");
  }

  if (decisions.oxygenMaker && pool >= OXYGEN_MAKER_COST) {
    pool -= OXYGEN_MAKER_COST;
    oxygenMakerOn = true;
  } else if (decisions.oxygenMaker) {
    notes.push("Air maker skipped — not enough power.");
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

  battery = Math.min(BATTERY_CAP, pool);
  if (pool > BATTERY_CAP) {
    notes.push(`Battery full — discarded ${pool - BATTERY_CAP} chips.`);
  }

  let shieldLevel = working.shieldLevel;
  let panelBonus = working.panelBonus;

  if (decisions.buildShield) {
    if (materials >= SHIELD_MATERIAL_COST && shieldLevel < SHIELD_LEVEL_MAX) {
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

  let water = working.water;
  let oxygen = working.oxygen;

  const waterUse = recyclerOn
    ? WATER_USE_WITHOUT_RECYCLER -
      (WATER_USE_WITHOUT_RECYCLER - WATER_USE_WITH_RECYCLER) *
        recyclerEfficiency
    : WATER_USE_WITHOUT_RECYCLER;
  water -= waterUse;
  if (recyclerOn) {
    notes.push(
      recyclerEfficiency < 1
        ? `Water −${waterUse}: cleaner on but clogged (half strength).`
        : `Water −${waterUse}: the water cleaner was on.`,
    );
  } else {
    notes.push(`Water −${waterUse}: the water cleaner was off.`);
  }

  if (oxygenMakerOn) {
    water -= OXYGEN_MAKER_WATER;
    oxygen += OXYGEN_MAKER_GAIN;
    notes.push(
      `Water −${OXYGEN_MAKER_WATER}, oxygen +${OXYGEN_MAKER_GAIN}: air maker was on.`,
    );
  }
  if (greenhouseOn) {
    water -= GREENHOUSE_WATER;
    oxygen += GREENHOUSE_OXYGEN;
    notes.push(
      `Water −${GREENHOUSE_WATER}, oxygen +${GREENHOUSE_OXYGEN}: greenhouse was on.`,
    );
  }
  oxygen -= OXYGEN_USE_PER_DAY;
  notes.push(`Oxygen −${OXYGEN_USE_PER_DAY}: the crew breathed.`);

  const pointsPerLevel =
    working.site === "rim" ? SCIENCE_POINTS_RIM : SCIENCE_POINTS_PLAIN;
  let scienceGain = sheltered ? 0 : scienceLevelsRun * pointsPerLevel;
  if (sheltered && scienceLevelsRun > 0) {
    notes.push("Sheltered — science that day is 0.");
  }
  if (greenhouseOn && !sheltered) {
    scienceGain += GREENHOUSE_SCIENCE;
  } else if (greenhouseOn && sheltered) {
    notes.push("Sheltered — greenhouse science cancelled.");
  }

  let science = working.science + scienceGain;
  if (scienceGain > 0) {
    notes.push(`Science +${scienceGain}: work outside or plants.`);
  }
  let exposure = working.exposure;

  if (!heatPowered) {
    exposure += UNPOWERED_HEAT_EXPOSURE;
    notes.push(
      `Crew risk +${UNPOWERED_HEAT_EXPOSURE}: heat had no power.`,
    );
  }

  // Unshielded habitat — small daily risk until shields are built.
  if (shieldLevel <= 0 && UNSHIELDED_DAILY_EXPOSURE > 0) {
    exposure += UNSHIELDED_DAILY_EXPOSURE;
    notes.push(
      `Crew risk +${UNSHIELDED_DAILY_EXPOSURE}: no storm shields on the base yet.`,
    );
  }

  const severity = event.stormSeverity;
  if (severity !== undefined) {
    const delta = stormExposureDelta(severity, shieldLevel, sheltered);
    exposure += delta;
    notes.push(
      sheltered
        ? `Crew risk +${delta.toFixed(1)}: storm hit while sheltered.`
        : `Crew risk +${delta.toFixed(1)}: storm hit while outside.`,
    );
  } else if (scienceLevelsRun > 0 && !sheltered) {
    const delta = normalOutsideExposure();
    exposure += delta;
    notes.push(`Crew risk +${delta}: crew worked outside.`);
  }

  let next: GameState = {
    ...working,
    battery,
    water,
    oxygen,
    materials,
    shieldLevel,
    panelBonus,
    exposure,
    science,
    recyclerEfficiency,
  };

  let effects = { ...option.effects };
  const riskMaterials = effects.riskMaterials;
  if (
    effects.riskChance !== undefined &&
    riskMaterials !== undefined &&
    rng &&
    rng() < effects.riskChance
  ) {
    effects = {
      ...effects,
      materials: (effects.materials ?? 0) + riskMaterials,
    };
    notes.push(
      `Materials ${riskMaterials}: a rushed choice went wrong.`,
    );
  }
  const applied = applyEffects(next, effects);
  next = applied.state;
  if (applied.scienceThatDayOverride !== undefined) {
    const withoutToday = working.science;
    next = {
      ...next,
      science: withoutToday + applied.scienceThatDayOverride,
    };
  }

  // Queue delayed costs (≥ 2 days later).
  const delayed = option.effects.delayed;
  let pending: PendingCost[] = [...(next.pending ?? [])];
  if (delayed && delayed.afterDays >= 2) {
    const entry: PendingCost = {
      applyOnDay: working.day + delayed.afterDays,
      note: delayed.note,
    };
    if (delayed.water !== undefined) entry.water = delayed.water;
    if (delayed.oxygen !== undefined) entry.oxygen = delayed.oxygen;
    if (delayed.materials !== undefined) entry.materials = delayed.materials;
    if (delayed.exposure !== undefined) entry.exposure = delayed.exposure;
    if (delayed.battery !== undefined) entry.battery = delayed.battery;
    pending = [...pending, entry];
    notes.push(
      `Later cost set for day ${entry.applyOnDay}: ${delayed.note}`,
    );
  }
  next = { ...next, pending };

  next.battery = Math.min(BATTERY_CAP, Math.max(0, next.battery));

  const lost = isLost(next);
  const finishedMission = working.day >= MISSION_DAYS && !lost;
  const nextDay = lost || finishedMission ? working.day : working.day + 1;

  const dayLog: DayLog = {
    day: working.day,
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
    log: [...working.log, dayLog],
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
