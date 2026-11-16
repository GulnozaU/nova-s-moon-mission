/**
 * One difficulty mode only (SPEC 6d / Prompt 1b).
 * Every tunable number lives in DIFFICULTY so balance passes can edit one object.
 * Tags: ASSUMPTION or REFERENCE (provenance badges).
 */

export type DifficultyConfig = {
  /** Mission length in Earth days. ASSUMPTION */
  missionDays: number;
  /** Starting water. ASSUMPTION */
  startWater: number;
  /** Starting oxygen. ASSUMPTION */
  startOxygen: number;
  /** Starting materials. ASSUMPTION */
  startMaterials: number;
  /** Starting battery. ASSUMPTION */
  startBattery: number;
  /** Battery cap. ASSUMPTION */
  batteryCap: number;

  /** Forced heat cost. ASSUMPTION */
  heatCost: number;
  /** Exposure if heat unpowered. ASSUMPTION */
  unpoweredHeatExposure: number;

  /** Recycler power cost. ASSUMPTION */
  recyclerCost: number;
  /** Water use with recycler. ASSUMPTION */
  waterUseWithRecycler: number;
  /** Water use without recycler. ASSUMPTION */
  waterUseWithoutRecycler: number;

  /** Oxygen maker power. ASSUMPTION */
  oxygenMakerCost: number;
  /** Oxygen maker gain. ASSUMPTION */
  oxygenMakerGain: number;
  /** Oxygen maker water use. ASSUMPTION */
  oxygenMakerWater: number;

  /** Comms power. ASSUMPTION */
  commsCost: number;

  /** Science power per level. ASSUMPTION */
  scienceCostPerLevel: number;
  /** Max science levels / day. ASSUMPTION */
  scienceLevelMax: number;
  /** Science points / level at plain. ASSUMPTION */
  sciencePointsPlain: number;
  /** Science points / level at rim. ASSUMPTION */
  sciencePointsRim: number;

  /**
   * Greenhouse: 1 power, 2 water; +1 oxygen, +1 science.
   * All ASSUMPTION (SPEC 3.4 / 3.5).
   */
  greenhouseCost: number;
  greenhouseWater: number;
  greenhouseOxygen: number;
  greenhouseScience: number;

  /** Crew oxygen use / day. ASSUMPTION */
  oxygenUsePerDay: number;

  /** Rim solar chips / day. ASSUMPTION (illumination pending LRO cite). */
  rimPowerPerDay: number;
  /** Plain day chips. ASSUMPTION */
  plainDayPower: number;
  /** Plain night chips. ASSUMPTION */
  plainNightPower: number;
  /** Lit days then night at plain. ASSUMPTION (~half of short mission). */
  plainLitDays: number;

  /** Shield build cost. ASSUMPTION */
  shieldMaterialCost: number;
  /** Max shield levels. ASSUMPTION */
  shieldLevelMax: number;
  /** Exposure cut per shield level. ASSUMPTION */
  shieldReductionPerLevel: number;

  /** Panel build cost. ASSUMPTION */
  panelMaterialCost: number;
  /** Extra chips / day per panel. ASSUMPTION */
  panelPowerBonus: number;

  /** Storm base = severity * this. ASSUMPTION */
  stormExposurePerSeverity: number;
  /** Sheltered storm multiplier. ASSUMPTION */
  shelterExposureFactor: number;
  /** Non-storm outdoor exposure. ASSUMPTION */
  normalOutsideExposure: number;
  /**
   * Extra crew risk each day while shieldLevel is 0 (unshielded habitat).
   * Pushes "shelter only, never build" strategies below 90% wins. ASSUMPTION (Stage 1).
   */
  unshieldedDailyExposure: number;

  /** Clean clogged filter: materials. ASSUMPTION */
  cleanFilterMaterialCost: number;
  /** Clean clogged filter: power from day's pool. ASSUMPTION */
  cleanFilterPowerCost: number;

  /** Lose thresholds. ASSUMPTION */
  loseWaterAt: number;
  loseOxygenAt: number;
  loseExposureAt: number;

  /**
   * Mission success = survive all days AND science ≥ this.
   * Forces players (and bots) to do science, not only hide. ASSUMPTION (Stage 1b).
   */
  scienceSuccessTarget: number;
};

/**
 * Tunable difficulty blob. Edit here for balance (Prompt 1b).
 * Greenhouse numbers match SPEC 3.4: 1 power, 2 water, +1 O2, +1 science.
 */
export const DIFFICULTY: DifficultyConfig = {
  missionDays: 10,
  // Tighter tanks — wasteful fixed plans run dry. ASSUMPTION (Stage 1b).
  startWater: 34,
  // Plain nights need the air maker; start just above 5×3 night drain. ASSUMPTION (Stage 1b).
  startOxygen: 18,
  startMaterials: 10,
  startBattery: 0,
  // Unused chips carry over; hard cap so kids cannot hoard forever. ASSUMPTION (Stage jobs).
  batteryCap: 12,

  heatCost: 2,
  unpoweredHeatExposure: 5,

  recyclerCost: 2,
  waterUseWithRecycler: 1,
  waterUseWithoutRecycler: 4,

  oxygenMakerCost: 2,
  oxygenMakerGain: 3,
  oxygenMakerWater: 1,

  commsCost: 1,

  scienceCostPerLevel: 1,
  scienceLevelMax: 4,
  sciencePointsPlain: 2,
  sciencePointsRim: 1.5,

  greenhouseCost: 1, // ASSUMPTION
  // 1 water keeps plants useful-but-costly, not a rim death trap. ASSUMPTION (Stage 1b).
  greenhouseWater: 1, // ASSUMPTION
  greenhouseOxygen: 1, // ASSUMPTION
  // Enough that a plant-heavy plan can sometimes hit the science goal. ASSUMPTION (Stage 1b).
  greenhouseScience: 2, // ASSUMPTION

  oxygenUsePerDay: 3,

  rimPowerPerDay: 8,
  plainDayPower: 8,
  // Nights: heat2; banked battery covers recycler + air. ASSUMPTION (Stage 1b).
  plainNightPower: 4,
  plainLitDays: 5,

  shieldMaterialCost: 2,
  shieldLevelMax: 4,
  shieldReductionPerLevel: 0.15,

  panelMaterialCost: 3,
  panelPowerBonus: 1,

  // Sev-3 unsheltered = 48, near loseExposureAt. ASSUMPTION (Stage 1b).
  stormExposurePerSeverity: 16,
  // Shelter keeps ~30% (≥50% cut vs out). ASSUMPTION (Stage 1).
  shelterExposureFactor: 0.3,
  // Outdoor science risk. ASSUMPTION (Stage 1b).
  normalOutsideExposure: 2,
  // Unshielded daily creep — rewards building before storms. ASSUMPTION (Stage 1b).
  unshieldedDailyExposure: 3.5,

  cleanFilterMaterialCost: 1, // ASSUMPTION
  cleanFilterPowerCost: 1, // ASSUMPTION

  loseWaterAt: 0,
  loseOxygenAt: 0,
  // Sev-3 out (48) is near-fatal. ASSUMPTION (Stage 1b).
  loseExposureAt: 52,

  // Above casual science-1 totals on plain; needs planned walks. ASSUMPTION (Stage 1b).
  scienceSuccessTarget: 14,
};

/** Named aliases so existing engine modules keep reading the same symbols. */
export const MISSION_DAYS = DIFFICULTY.missionDays;
export const START_WATER = DIFFICULTY.startWater;
export const START_OXYGEN = DIFFICULTY.startOxygen;
export const START_MATERIALS = DIFFICULTY.startMaterials;
export const START_BATTERY = DIFFICULTY.startBattery;
export const BATTERY_CAP = DIFFICULTY.batteryCap;
export const HEAT_COST = DIFFICULTY.heatCost;
export const UNPOWERED_HEAT_EXPOSURE = DIFFICULTY.unpoweredHeatExposure;
export const RECYCLER_COST = DIFFICULTY.recyclerCost;
export const WATER_USE_WITH_RECYCLER = DIFFICULTY.waterUseWithRecycler;
export const WATER_USE_WITHOUT_RECYCLER = DIFFICULTY.waterUseWithoutRecycler;
export const OXYGEN_MAKER_COST = DIFFICULTY.oxygenMakerCost;
export const OXYGEN_MAKER_GAIN = DIFFICULTY.oxygenMakerGain;
export const OXYGEN_MAKER_WATER = DIFFICULTY.oxygenMakerWater;
export const COMMS_COST = DIFFICULTY.commsCost;
export const SCIENCE_COST_PER_LEVEL = DIFFICULTY.scienceCostPerLevel;
export const SCIENCE_LEVEL_MAX = DIFFICULTY.scienceLevelMax;
export const SCIENCE_POINTS_PLAIN = DIFFICULTY.sciencePointsPlain;
export const SCIENCE_POINTS_RIM = DIFFICULTY.sciencePointsRim;
export const GREENHOUSE_COST = DIFFICULTY.greenhouseCost;
export const GREENHOUSE_WATER = DIFFICULTY.greenhouseWater;
export const GREENHOUSE_OXYGEN = DIFFICULTY.greenhouseOxygen;
export const GREENHOUSE_SCIENCE = DIFFICULTY.greenhouseScience;
export const OXYGEN_USE_PER_DAY = DIFFICULTY.oxygenUsePerDay;
export const RIM_POWER_PER_DAY = DIFFICULTY.rimPowerPerDay;
export const PLAIN_DAY_POWER = DIFFICULTY.plainDayPower;
export const PLAIN_NIGHT_POWER = DIFFICULTY.plainNightPower;
export const PLAIN_LIT_DAYS = DIFFICULTY.plainLitDays;
export const SHIELD_MATERIAL_COST = DIFFICULTY.shieldMaterialCost;
export const SHIELD_LEVEL_MAX = DIFFICULTY.shieldLevelMax;
export const SHIELD_REDUCTION_PER_LEVEL = DIFFICULTY.shieldReductionPerLevel;
export const PANEL_MATERIAL_COST = DIFFICULTY.panelMaterialCost;
export const PANEL_POWER_BONUS = DIFFICULTY.panelPowerBonus;
export const STORM_EXPOSURE_PER_SEVERITY = DIFFICULTY.stormExposurePerSeverity;
export const SHELTER_EXPOSURE_FACTOR = DIFFICULTY.shelterExposureFactor;
export const NORMAL_OUTSIDE_EXPOSURE = DIFFICULTY.normalOutsideExposure;
export const UNSHIELDED_DAILY_EXPOSURE = DIFFICULTY.unshieldedDailyExposure;
export const CLEAN_FILTER_MATERIAL_COST = DIFFICULTY.cleanFilterMaterialCost;
export const CLEAN_FILTER_POWER_COST = DIFFICULTY.cleanFilterPowerCost;
export const LOSE_WATER_AT = DIFFICULTY.loseWaterAt;
export const LOSE_OXYGEN_AT = DIFFICULTY.loseOxygenAt;
export const LOSE_EXPOSURE_AT = DIFFICULTY.loseExposureAt;
export const SCIENCE_SUCCESS_TARGET = DIFFICULTY.scienceSuccessTarget;

/** Single mode name for UI / reports (SPEC 6d). */
export const GAME_MODE = "standard" as const;
