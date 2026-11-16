export type Aabb = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export function pointInAabb(x: number, z: number, b: Aabb): boolean {
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
}

/** Resolve player against solid boxes (XZ plane). */
export function resolveCollision(
  x: number,
  z: number,
  radius: number,
  solids: Aabb[],
): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (const b of solids) {
    const nearestX = Math.max(b.minX, Math.min(px, b.maxX));
    const nearestZ = Math.max(b.minZ, Math.min(pz, b.maxZ));
    const dx = px - nearestX;
    const dz = pz - nearestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius && distSq > 1e-8) {
      const dist = Math.sqrt(distSq);
      const push = (radius - dist) / dist;
      px += dx * push;
      pz += dz * push;
    } else if (distSq <= 1e-8 && pointInAabb(px, pz, b)) {
      // Stuck inside — push to nearest edge
      const left = Math.abs(px - b.minX);
      const right = Math.abs(b.maxX - px);
      const top = Math.abs(pz - b.minZ);
      const bot = Math.abs(b.maxZ - pz);
      const m = Math.min(left, right, top, bot);
      if (m === left) px = b.minX - radius;
      else if (m === right) px = b.maxX + radius;
      else if (m === top) pz = b.minZ - radius;
      else pz = b.maxZ + radius;
    }
  }
  return { x: px, z: pz };
}

export function clampToBounds(
  x: number,
  z: number,
  bounds: Aabb,
  radius: number,
): { x: number; z: number } {
  return {
    x: Math.max(bounds.minX + radius, Math.min(bounds.maxX - radius, x)),
    z: Math.max(bounds.minZ + radius, Math.min(bounds.maxZ - radius, z)),
  };
}
