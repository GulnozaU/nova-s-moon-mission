import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ToonMesh } from "./toon";
import { PALETTE, WORLD } from "./palette";
import { prefersReducedMotion } from "./reducedMotion";
import {
  clampToBounds,
  resolveCollision,
  type Aabb,
} from "./collision";

type Props = {
  position: THREE.Vector3;
  bounds: Aabb;
  solids: Aabb[];
  locked?: boolean;
};

/**
 * WASD / arrows + click-to-walk. Simple XZ collision. Faces travel direction.
 * Character mesh is local so walk/idle animate without React re-renders.
 */
export function PlayerController({
  position,
  bounds,
  solids,
  locked = false,
}: Props) {
  const keys = useRef<Record<string, boolean>>({});
  const walkTarget = useRef<THREE.Vector3 | null>(null);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const t = useRef(0);
  const dustCool = useRef(0);
  const { camera } = useThree();
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const wish = useRef(new THREE.Vector3());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (
        e.code.startsWith("Arrow") ||
        e.code.startsWith("KeyW") ||
        e.code === "KeyA" ||
        e.code === "KeyS" ||
        e.code === "KeyD"
      ) {
        walkTarget.current = null;
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, dt) => {
    if (!root.current || !body.current) return;
    t.current += dt;

    let mx = 0;
    let mz = 0;
    if (!locked) {
      const k = keys.current;
      if (k.KeyW || k.ArrowUp) mz -= 1;
      if (k.KeyS || k.ArrowDown) mz += 1;
      if (k.KeyA || k.ArrowLeft) mx -= 1;
      if (k.KeyD || k.ArrowRight) mx += 1;
    }

    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current
      .crossVectors(forward.current, new THREE.Vector3(0, 1, 0))
      .normalize();

    wish.current.set(0, 0, 0);
    if (!locked && (mx !== 0 || mz !== 0)) {
      wish.current.addScaledVector(right.current, mx);
      wish.current.addScaledVector(forward.current, -mz);
      wish.current.normalize();
      walkTarget.current = null;
    } else if (!locked && walkTarget.current) {
      wish.current.copy(walkTarget.current).sub(position);
      wish.current.y = 0;
      if (wish.current.lengthSq() < 0.1) walkTarget.current = null;
      else wish.current.normalize();
    }

    const moving = wish.current.lengthSq() > 0.01;
    if (moving) {
      root.current.rotation.y = Math.atan2(wish.current.x, wish.current.z);
      const speed = WORLD.walkSpeedFast;
      position.x += wish.current.x * speed * dt;
      position.z += wish.current.z * speed * dt;
      const resolved = resolveCollision(position.x, position.z, 0.35, solids);
      const clamped = clampToBounds(resolved.x, resolved.z, bounds, 0.35);
      position.x = clamped.x;
      position.z = clamped.z;
    }

    root.current.position.set(position.x, position.y, position.z);

    const reduce = prefersReducedMotion();
    if (reduce) {
      body.current.position.y = 0;
      body.current.scale.set(1, 1, 1);
    } else if (moving) {
      const bob = Math.sin(t.current * 10) * 0.06;
      body.current.position.y = bob;
      body.current.scale.set(1, 1 + bob * 0.35, 1);
      dustCool.current -= dt;
    } else {
      const breathe = 1 + Math.sin(t.current * 2.2) * 0.025;
      body.current.position.y = 0;
      body.current.scale.set(1, breathe, 1);
    }
  });

  return (
    <>
      <group ref={root}>
        <group ref={body}>
          <ToonMesh
            geometry="capsule"
            color={PALETTE.warmYellow}
            radius={0.12}
            height={0.28}
            position={[-0.12, 0.28, 0]}
          />
          <ToonMesh
            geometry="capsule"
            color={PALETTE.warmYellow}
            radius={0.12}
            height={0.28}
            position={[0.12, 0.28, 0]}
          />
          <ToonMesh
            color={PALETTE.warmYellow}
            width={0.55}
            height={0.55}
            depth={0.35}
            position={[0, 0.7, 0]}
          />
          <ToonMesh
            color={PALETTE.peach}
            width={0.35}
            height={0.3}
            depth={0.12}
            position={[0, 0.75, -0.22]}
          />
          <ToonMesh
            geometry="sphere"
            color={PALETTE.cream}
            radius={0.28}
            position={[0, 1.15, 0]}
          />
          <ToonMesh
            geometry="sphere"
            color={PALETTE.dustyBlue}
            radius={0.22}
            position={[0, 1.15, 0.12]}
            outline={0}
          />
        </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[0.35, 12]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.22} />
        </mesh>
        {/* Dust puffs while walking (skipped under reduced-motion via opacity). */}
        {!prefersReducedMotion() ? (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0.2]}>
            <circleGeometry args={[0.12, 8]} />
            <meshBasicMaterial
              color={PALETTE.moonDust}
              transparent
              opacity={0.35}
            />
          </mesh>
        ) : null}
      </group>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onPointerDown={(e) => {
          if (locked) return;
          e.stopPropagation();
          walkTarget.current = new THREE.Vector3(e.point.x, 0, e.point.z);
        }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  );
}
