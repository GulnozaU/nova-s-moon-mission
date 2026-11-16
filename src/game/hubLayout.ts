import { RAIL_W, WORLD_H, WORLD_W } from "./ui/railLayout";

/**
 * Soft-pixel hub UV layout for `moon-base-hub-pixel.jpg` (1024×571).
 * Positions are fractions of the world frame (right of the side rail),
 * retuned so doors sit on the painted orange / green / blue doors.
 *
 * UX rule: drag pads live in the foreground dirt strip
 * (y ≈ 0.62–0.88), never over roofs.
 */

export type HubUv = { u: number; v: number };

export const HUB_ART_KEY = "hubPixel";

/** Full-bleed painted base — replaces stacked habitat cutouts. */
export const HUB = {
  /** Orange door — Crew home (left module). */
  homeDoor: { u: 0.3, v: 0.64 } as HubUv,
  /** Green door — Greenhouse dome (center). */
  greenhouseDoor: { u: 0.5, v: 0.66 } as HubUv,
  /** Blue door — Science lab / comms (right module under dish). */
  labDoor: { u: 0.68, v: 0.64 } as HubUv,
  /** Drop chips here — ground in front of the painted dish module. */
  radio: { u: 0.7, v: 0.78 } as HubUv,
  /** Dish spin overlay (roof of right module). */
  dish: { u: 0.7, v: 0.28 } as HubUv,
  /** Solar shimmer overlay (left array). */
  panels: { u: 0.14, v: 0.52 } as HubUv,
  /** Rover bounce + science-walk drop. */
  rover: { u: 0.88, v: 0.72 } as HubUv,
  /** Shield build — dirt in front of home. */
  shield: { u: 0.28, v: 0.74 } as HubUv,
  /** Material crates pile — left foreground. */
  crates: { u: 0.1, v: 0.82 } as HubUv,
  /** Default Nova spawn (open courtyard). */
  spawn: { u: 0.5, v: 0.8 } as HubUv,
  /** Walkable dirt band. */
  walkMinV: 0.58,
  walkMaxV: 0.9,
} as const;

/** Map a hub fraction into the world frame (not the side rail). */
export function uvToWorld(uv: HubUv): { x: number; y: number } {
  return { x: RAIL_W + WORLD_W * uv.u, y: WORLD_H * uv.v };
}
