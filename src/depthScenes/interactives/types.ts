import type { SfxId } from "../../audio/audio";
import type { PlaceId } from "../types";
import type { SourceBadge } from "../../types";

export type InteractiveKind = "drop" | "use" | "info";

export type DragKind = "chip" | "water" | "crate" | "sample" | "nova" | "crew";

export type CostBenefit = {
  /** Short icon+number chips, e.g. "⚡−2" "💧+3" */
  costs: string[];
  benefits: string[];
};

export type InteractiveDef = {
  id: string;
  place: PlaceId;
  label: string;
  kind: InteractiveKind;
  /** Painting UV center. */
  uv: [number, number];
  /** World billboard scale. */
  scale: number;
  cutout: string;
  /** Accept these drag payloads (drop targets). */
  accepts?: DragKind[];
  /** Must be within this world distance to USE (tap). */
  useRadius?: number;
  costBenefit: CostBenefit;
  /** Machine idle pulse. */
  machine?: boolean;
  /** One plain NASA sentence + badge for INFO (or after USE info). */
  info?: { text: string; badge: SourceBadge };
  sfx: SfxId;
  /** Optional second sfx on success. */
  sfxDone?: SfxId;
};

export type CrewId = "sam" | "mira" | "ana";

export type DragPayload = {
  kind: DragKind;
  amount: number;
  /** Storm crew portrait id when kind === "crew". */
  crewId?: CrewId;
};

export type PlaceFx = {
  roverTrip: boolean;
  roverSamples: number;
  plantStage: [number, number, number, number];
  plantWilt: [boolean, boolean, boolean, boolean];
  shieldPulse: number;
  tankPulse: number;
  analyzerGlow: boolean;
  growLightOn: boolean;
  waterHeld: number;
  samplesHeld: number;
  materialsHeld: number;
  harvestReady: boolean;
  dayEnding: boolean;
  /** Partial chip fills toward machine costs (engine chip costs). */
  fills: Record<string, number>;
  /** Storm shelter map. */
  sheltered: Record<CrewId, boolean>;
};
