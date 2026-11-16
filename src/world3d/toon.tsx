import { useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "./palette";

/** 3-step toon gradient (MeshToonMaterial). Shared, not recreated per mesh. */
let cachedGrad: THREE.DataTexture | null = null;

export function toonGradient(): THREE.DataTexture {
  if (cachedGrad) return cachedGrad;
  // RGBA 3-step ramp
  const data = new Uint8Array([
    70, 70, 80, 255, 150, 150, 160, 255, 255, 255, 255, 255,
  ]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  cachedGrad = tex;
  return tex;
}

type ToonMeshProps = {
  color: string;
  geometry?: "box" | "sphere" | "cylinder" | "capsule";
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  outline?: number;
  radius?: number;
  height?: number;
  width?: number;
  depth?: number;
};

/**
 * Flat toon mesh + optional inverted-hull outline. No textures, no post-FX.
 */
export function ToonMesh({
  color,
  geometry = "box",
  position,
  rotation,
  scale = 1,
  castShadow = true,
  receiveShadow = false,
  outline = 0.04,
  radius = 0.5,
  height = 1,
  width = 1,
  depth = 1,
}: ToonMeshProps) {
  const grad = useMemo(() => toonGradient(), []);
  const s = typeof scale === "number" ? ([scale, scale, scale] as const) : scale;

  return (
    <group position={position} rotation={rotation} scale={s}>
      <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
        {geometry === "box" && <boxGeometry args={[width, height, depth]} />}
        {geometry === "sphere" && <sphereGeometry args={[radius, 12, 10]} />}
        {geometry === "cylinder" && (
          <cylinderGeometry args={[radius, radius, height, 10]} />
        )}
        {geometry === "capsule" && (
          <capsuleGeometry args={[radius, height, 4, 8]} />
        )}
        <meshToonMaterial color={color} gradientMap={grad} />
      </mesh>
      {outline > 0 ? (
        <mesh scale={1 + outline}>
          {geometry === "box" && <boxGeometry args={[width, height, depth]} />}
          {geometry === "sphere" && <sphereGeometry args={[radius, 10, 8]} />}
          {geometry === "cylinder" && (
            <cylinderGeometry args={[radius, radius, height, 8]} />
          )}
          {geometry === "capsule" && (
            <capsuleGeometry args={[radius, height, 3, 6]} />
          )}
          <meshBasicMaterial
            color={PALETTE.outline}
            side={THREE.BackSide}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}
