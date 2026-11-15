import type { GameState } from "../types";
import { LOSE_EXPOSURE_AT } from "../engine/constants";

export type RankId = "cadet" | "flight-engineer" | "mission-commander";

export type RankResult = {
  id: RankId;
  title: string;
  why: string;
};

/**
 * SPEC 6d rank from crew safety, science, and supplies left.
 */
export function rankFromState(state: GameState, won: boolean): RankResult {
  const safetyScore = Math.max(
    0,
    1 - state.exposure / LOSE_EXPOSURE_AT,
  );
  const supplyScore = Math.min(1, (state.water / 40 + state.oxygen / 30) / 2);
  const scienceScore = Math.min(1, state.science / 25);
  const total = safetyScore * 0.4 + supplyScore * 0.3 + scienceScore * 0.3;

  if (!won) {
    return {
      id: "cadet",
      title: "Cadet",
      why: "The mission stopped early. Try again and watch water and storms.",
    };
  }
  if (total >= 0.72) {
    return {
      id: "mission-commander",
      title: "Mission Commander",
      why: "You kept people safe, kept supplies up, and earned strong science.",
    };
  }
  if (total >= 0.45) {
    return {
      id: "flight-engineer",
      title: "Flight Engineer",
      why: "Solid choices. A little more balance could push you higher.",
    };
  }
  return {
    id: "cadet",
    title: "Cadet",
    why: "You finished — next time, guard water and watch the storm days.",
  };
}
