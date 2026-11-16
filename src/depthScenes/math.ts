import * as THREE from "three";
import type { FloorDef } from "./types";

/** Painting UV → walk plane. v=0 top/far, v=1 bottom/near. */
export function uvToWorld(
  uv: [number, number],
  worldW: number,
  worldD: number,
): THREE.Vector3 {
  const x = (uv[0] - 0.5) * worldW;
  const z = (uv[1] - 0.35) * worldD;
  return new THREE.Vector3(x, 0, z);
}

export function worldToUv(
  x: number,
  z: number,
  worldW: number,
  worldD: number,
): [number, number] {
  return [x / worldW + 0.5, z / worldD + 0.35];
}

export function pointInPoly(
  x: number,
  z: number,
  poly: [number, number][],
  worldW: number,
  worldD: number,
): boolean {
  const u = x / worldW + 0.5;
  const v = z / worldD + 0.35;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i]![0];
    const yi = poly[i]![1];
    const xj = poly[j]![0];
    const yj = poly[j]![1];
    const intersect =
      yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Room cross ~3–4s; door-to-door under ~5s on medium floors. */
export const WALK_SPEED = 1.45;

export function doorWorldPos(floor: FloorDef, doorIndex: number): THREE.Vector3 {
  const door = floor.doors[doorIndex]!;
  const [w, d] = floor.worldSize;
  return uvToWorld(door.uv, w, d);
}

export function nearDoor(
  x: number,
  z: number,
  floor: FloorDef,
): FloorDef["doors"][number] | null {
  const [w, d] = floor.worldSize;
  const [u, v] = worldToUv(x, z, w, d);
  for (const door of floor.doors) {
    const du = u - door.uv[0];
    const dv = v - door.uv[1];
    if (du * du + dv * dv <= door.radiusUv * door.radiusUv) return door;
  }
  return null;
}
