import {
  START_BATTERY,
  START_MATERIALS,
  START_OXYGEN,
  START_WATER,
} from "./constants";
import { createRng } from "./rng";
import type { CreateGameResult } from "./types";
import type { SiteId } from "../types";

export function createGame(site: SiteId, seed: number): CreateGameResult {
  const state = {
    day: 1,
    site,
    battery: START_BATTERY,
    water: START_WATER,
    oxygen: START_OXYGEN,
    materials: START_MATERIALS,
    shieldLevel: 0,
    panelBonus: 0,
    exposure: 0,
    science: 0,
    recyclerEfficiency: 1,
    log: [],
  };

  return {
    state,
    seed,
    rng: createRng(seed),
  };
}
