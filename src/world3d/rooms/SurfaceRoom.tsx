import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ToonMesh } from "../toon";
import { PALETTE, WORLD } from "../palette";
import type { Aabb } from "../collision";
import { Character } from "../Character";

type Props = {
  onDoor: (place: "home" | "greenhouse" | "lab") => void;
  playerPos: THREE.Vector3;
};

const HALF_W = WORLD.surface.w / 2;
const HALF_D = WORLD.surface.d / 2;

/** Building footprints + door triggers on the Moon surface (~60×45). */
export function surfaceSolids(): Aabb[] {
  return [
    { minX: -22, maxX: -14, minZ: -6, maxZ: 2 }, // home
    { minX: -4, maxX: 4, minZ: -8, maxZ: 0 }, // greenhouse
    { minX: 14, maxX: 22, minZ: -6, maxZ: 2 }, // lab
  ];
}

export function surfaceBounds(): Aabb {
  return {
    minX: -HALF_W + 1,
    maxX: HALF_W - 1,
    minZ: -HALF_D + 1,
    maxZ: HALF_D - 1,
  };
}

export function SurfaceRoom({ onDoor, playerPos }: Props) {
  const doors = useMemo(
    () =>
      [
        { place: "home" as const, x: -18, z: 2.4, r: 1.4 },
        { place: "greenhouse" as const, x: 0, z: 0.4, r: 1.4 },
        { place: "lab" as const, x: 18, z: 2.4, r: 1.4 },
      ] as const,
    [],
  );
  const cool = useRef(0);

  useFrame((_, dt) => {
    cool.current = Math.max(0, cool.current - dt);
    if (cool.current > 0) return;
    for (const d of doors) {
      const dx = playerPos.x - d.x;
      const dz = playerPos.z - d.z;
      if (dx * dx + dz * dz < d.r * d.r) {
        cool.current = 1;
        onDoor(d.place);
        break;
      }
    }
  });

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[WORLD.surface.w, WORLD.surface.d]} />
        <meshToonMaterial color={PALETTE.moonDust} />
      </mesh>

      <InstancedCraters />
      <InstancedStars />

      {/* Buildings — placeholder blocks, walkable around */}
      <Building x={-18} z={-2} label="home" color={PALETTE.peach} />
      <Building x={0} z={-4} label="gh" color={PALETTE.sage} />
      <Building x={18} z={-2} label="lab" color={PALETTE.lavender} />

      {/* Physical door slabs */}
      {doors.map((d) => (
        <ToonMesh
          key={d.place}
          color={PALETTE.warmYellow}
          width={1.6}
          height={2}
          depth={0.35}
          position={[d.x, 1, d.z]}
          outline={0.03}
        />
      ))}

      {/* Dish / panels props */}
      <ToonMesh
        geometry="cylinder"
        color={PALETTE.dustyBlue}
        radius={0.15}
        height={2}
        position={[6, 1, 8]}
      />
      <ToonMesh
        geometry="sphere"
        color={PALETTE.cream}
        radius={0.7}
        position={[6, 2.2, 8]}
        outline={0.03}
      />
      <ToonMesh
        color={PALETTE.warmYellow}
        width={3}
        height={0.15}
        depth={1.5}
        position={[-6, 0.4, 10]}
      />

      {/* Idle crew on surface (ambient) */}
      <Character id="sam" position={[-12, 0, 6]} yaw={0.4} />
    </group>
  );
}

function Building({
  x,
  z,
  color,
}: {
  x: number;
  z: number;
  label: string;
  color: string;
}) {
  return (
    <group position={[x, 0, z]}>
      <ToonMesh
        color={color}
        width={7}
        height={4}
        depth={6}
        position={[0, 2, 0]}
        outline={0.035}
      />
      <ToonMesh
        color={PALETTE.cream}
        width={7.4}
        height={0.4}
        depth={6.4}
        position={[0, 4.2, 0]}
        outline={0.03}
      />
    </group>
  );
}

function InstancedCraters() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = 40;
  useMemo(() => {
    // positions baked on first render via layout effect substitute
  }, []);
  useFrame(() => {
    if (!mesh.current || mesh.current.userData.ready) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * WORLD.surface.w * 0.9;
      const z = (Math.random() - 0.5) * WORLD.surface.d * 0.9;
      const s = 0.4 + Math.random() * 1.2;
      dummy.position.set(x, 0.02, z);
      dummy.scale.set(s, 0.08, s);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.userData.ready = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} receiveShadow>
      <cylinderGeometry args={[1, 1.1, 1, 8]} />
      <meshToonMaterial color={PALETTE.moonDark} />
    </instancedMesh>
  );
}

function InstancedStars() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = 60;
  useFrame(() => {
    if (!mesh.current || mesh.current.userData.ready) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 80,
        12 + Math.random() * 20,
        (Math.random() - 0.5) * 80,
      );
      const s = 0.08 + Math.random() * 0.12;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.userData.ready = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color={PALETTE.cream} />
    </instancedMesh>
  );
}
