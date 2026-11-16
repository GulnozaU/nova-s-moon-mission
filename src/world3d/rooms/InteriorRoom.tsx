import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ToonMesh } from "../toon";
import { PALETTE, WORLD } from "../palette";
import type { Aabb } from "../collision";
import type { PlaceId3d } from "../palette";
import { Character } from "../Character";
import { prefersReducedMotion } from "../reducedMotion";

type Props = {
  place: Exclude<PlaceId3d, "surface">;
  onExit: () => void;
  playerPos: THREE.Vector3;
  cameraPos: THREE.Vector3;
};

const W = WORLD.interior.w;
const D = WORLD.interior.d;
const HW = W / 2;
const HD = D / 2;

export function interiorBounds(): Aabb {
  return {
    minX: -HW + 0.6,
    maxX: HW - 0.6,
    minZ: -HD + 0.6,
    maxZ: HD - 0.6,
  };
}

/** Wall AABBs for collision (open doorway on +Z). */
export function interiorSolids(): Aabb[] {
  const t = 0.4;
  return [
    { minX: -HW, maxX: HW, minZ: -HD - t, maxZ: -HD }, // back
    { minX: -HW - t, maxX: -HW, minZ: -HD, maxZ: HD }, // left
    { minX: HW, maxX: HW + t, minZ: -HD, maxZ: HD }, // right
    // front wall with door gap
    { minX: -HW, maxX: -1.2, minZ: HD, maxZ: HD + t },
    { minX: 1.2, maxX: HW, minZ: HD, maxZ: HD + t },
  ];
}

const FLOOR: Record<Exclude<PlaceId3d, "surface">, string> = {
  home: PALETTE.floorHome,
  greenhouse: PALETTE.floorGh,
  lab: PALETTE.floorLab,
};

const CREW: Record<
  Exclude<PlaceId3d, "surface">,
  { id: "sam" | "mira" | "ana"; pos: [number, number, number] }
> = {
  home: { id: "sam", pos: [-4, 0, -2] },
  greenhouse: { id: "mira", pos: [3, 0, -3] },
  lab: { id: "ana", pos: [-3, 0, -2] },
};

/**
 * Medium interior (~16×12). Walls facing the camera fade out.
 * Exit door on +Z — walk through to surface.
 */
export function InteriorRoom({ place, onExit, playerPos, cameraPos }: Props) {
  const cool = useRef(0);
  const backWall = useRef<THREE.Mesh>(null);
  const leftWall = useRef<THREE.Mesh>(null);
  const rightWall = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    cool.current = Math.max(0, cool.current - dt);
    // Exit door at +Z
    if (
      cool.current <= 0 &&
      playerPos.z > HD - 0.3 &&
      Math.abs(playerPos.x) < 1.2
    ) {
      cool.current = 1;
      onExit();
    }
    // Fade walls facing camera (dot of wall normal vs cam→room)
    fadeWall(backWall.current, 0, -1, cameraPos);
    fadeWall(leftWall.current, 1, 0, cameraPos);
    fadeWall(rightWall.current, -1, 0, cameraPos);
  });

  const crew = CREW[place];
  const floor = FLOOR[place];

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshToonMaterial color={floor} />
      </mesh>

      {/* Walls */}
      <mesh ref={backWall} position={[0, 2, -HD]} castShadow>
        <boxGeometry args={[W, 4, 0.35]} />
        <meshToonMaterial color={PALETTE.wall} transparent opacity={1} />
      </mesh>
      <mesh ref={leftWall} position={[-HW, 2, 0]} castShadow>
        <boxGeometry args={[0.35, 4, D]} />
        <meshToonMaterial color={PALETTE.wall} transparent opacity={1} />
      </mesh>
      <mesh ref={rightWall} position={[HW, 2, 0]} castShadow>
        <boxGeometry args={[0.35, 4, D]} />
        <meshToonMaterial color={PALETTE.wall} transparent opacity={1} />
      </mesh>
      {/* Front segments */}
      <ToonMesh
        color={PALETTE.wall}
        width={HW - 1.2}
        height={4}
        depth={0.35}
        position={[-(HW + 1.2) / 2, 2, HD]}
        outline={0.02}
      />
      <ToonMesh
        color={PALETTE.wall}
        width={HW - 1.2}
        height={4}
        depth={0.35}
        position={[(HW + 1.2) / 2, 2, HD]}
        outline={0.02}
      />

      {/* Exit door */}
      <ToonMesh
        color={PALETTE.warmYellow}
        width={2}
        height={2.2}
        depth={0.3}
        position={[0, 1.1, HD]}
        outline={0.03}
      />

      {/* Room props */}
      {place === "home" && (
        <>
          <ToonMesh color={PALETTE.dustyBlue} width={2} height={0.6} depth={1.2} position={[4, 0.3, -3]} />
          <ToonMesh color={PALETTE.lavender} width={1.5} height={0.5} depth={2} position={[-5, 0.25, 2]} />
        </>
      )}
      {place === "greenhouse" && (
        <>
          <ToonMesh color={PALETTE.sage} width={1} height={1.2} depth={1} position={[-3, 0.6, -2]} />
          <ToonMesh color={PALETTE.sage} width={1} height={0.8} depth={1} position={[0, 0.4, -2]} />
          <ToonMesh color={PALETTE.sage} width={1} height={1.4} depth={1} position={[3, 0.7, -2]} />
          <ToonMesh color={PALETTE.dustyBlue} width={0.4} height={2} depth={0.4} position={[-5, 1, 2]} />
        </>
      )}
      {place === "lab" && (
        <>
          <ToonMesh color={PALETTE.dustyBlue} width={3} height={2} depth={0.2} position={[0, 2, -HD + 0.3]} />
          <ToonMesh color={PALETTE.peach} width={1.5} height={1} depth={0.8} position={[4, 0.5, 0]} />
        </>
      )}

      <Character id={crew.id} position={crew.pos} yaw={Math.PI * 0.2} />
    </group>
  );
}

function fadeWall(
  mesh: THREE.Mesh | null,
  nx: number,
  nz: number,
  cam: THREE.Vector3,
) {
  if (!mesh) return;
  const mat = mesh.material as THREE.MeshToonMaterial;
  if (prefersReducedMotion()) {
    mat.opacity = 1;
    return;
  }
  // Camera relative to room center
  const cx = cam.x;
  const cz = cam.z;
  const dot = nx * cx + nz * cz;
  // When camera is on the normal side looking in, fade that wall
  const facing = dot > 2;
  const target = facing ? 0.12 : 1;
  mat.transparent = true;
  mat.opacity += (target - mat.opacity) * 0.12;
  mat.depthWrite = mat.opacity > 0.5;
}
