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

  /** Lose thresholds. ASSUMPTION */
  loseWaterAt: number;
  loseOxygenAt: number;
  loseExposureAt: number;
};

/**
 * Tunable difficulty blob. Edit here for balance (Prompt 1b).
 * Greenhouse numbers match SPEC 3.4: 1 power, 2 water, +1 O2, +1 science.
 */
export const DIFFICULTY: DifficultyConfig = {
  missionDays: 10,
  // Near original 40 — greenhouse-heavy is strong but not free. ASSUMPTION (balance pass).
  startWater: 39,
  // Lowered from 30 — skipping the maker on plain nights bites. ASSUMPTION (balance pass).
  startOxygen: 22,
  startMaterials: 10,
  startBattery: 0,
  batteryCap: 20,

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
  greenhouseWater: 2, // ASSUMPTION
  greenhouseOxygen: 1, // ASSUMPTION
  greenhouseScience: 1, // ASSUMPTION

  oxygenUsePerDay: 3,

  rimPowerPerDay: 8,
  plainDayPower: 8,
  // Raised from 0 — nights still need heat (2); stops plain auto-fail from unpowered exposure. ASSUMPTION (balance pass).
  plainNightPower: 2,
  plainLitDays: 5,

  shieldMaterialCost: 2,
  shieldLevelMax: 4,
  // Lowered from 0.2 — need more investment for the same protection. ASSUMPTION (balance pass).
  shieldReductionPerLevel: 0.15,

  panelMaterialCost: 3,
  panelPowerBonus: 1,

  // Mild bump from 15 — two Class-C storms + outdoor science ≈ win; any M/X usually loses. ASSUMPTION (balance pass).
  stormExposurePerSeverity: 16,
  // Raised from 0.15 — shelter without shields barely helps. ASSUMPTION (balance pass).
  shelterExposureFactor: 0.95,
  normalOutsideExposure: 2,

  loseWaterAt: 0,
  loseOxygenAt: 0,
  // Lowered from 100 — three storms can fail shelter-only safety. ASSUMPTION (balance pass).
  loseExposureAt: 60,
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
export const LOSE_WATER_AT = DIFFICULTY.loseWaterAt;
export const LOSE_OXYGEN_AT = DIFFICULTY.loseOxygenAt;
export const LOSE_EXPOSURE_AT = DIFFICULTY.loseExposureAt;

/** Single mode name for UI / reports (SPEC 6d). */
export const GAME_MODE = "standard" as const;
