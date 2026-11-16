import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ToonMesh } from "./toon";
import { PALETTE, WORLD } from "./palette";
import { prefersReducedMotion } from "./reducedMotion";

export type CharacterId = "nova" | "sam" | "mira" | "ana";

const COLORS: Record<CharacterId, { suit: string; accent: string }> = {
  nova: { suit: PALETTE.warmYellow, accent: PALETTE.peach },
  sam: { suit: PALETTE.dustyBlue, accent: PALETTE.cream },
  mira: { suit: PALETTE.sage, accent: PALETTE.peach },
  ana: { suit: PALETTE.lavender, accent: PALETTE.cream },
};

type Props = {
  id: CharacterId;
  position: [number, number, number];
  yaw?: number;
  moving?: boolean;
  scale?: number;
};

/**
 * Low-poly crew from primitives (original / CC0 — see REFERENCES).
 * Walk bob + idle breathe; turns via yaw.
 */
export function Character({
  id,
  position,
  yaw = 0,
  moving = false,
  scale = 1,
}: Props) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const t = useRef(0);
  const colors = COLORS[id];
  void WORLD;
  void scale;

  useFrame((_, dt) => {
    if (!group.current || !body.current) return;
    const reduce = prefersReducedMotion();
    t.current += dt;
    group.current.position.set(position[0], position[1], position[2]);
    group.current.rotation.y = yaw;
    if (reduce) {
      body.current.position.y = 0;
      body.current.scale.set(1, 1, 1);
      return;
    }
    if (moving) {
      const bob = Math.sin(t.current * 10) * 0.06;
      body.current.position.y = bob;
      body.current.scale.set(1, 1 + bob * 0.4, 1);
    } else {
      const breathe = 1 + Math.sin(t.current * 2.2) * 0.025;
      body.current.position.y = 0;
      body.current.scale.set(1, breathe, 1);
    }
  });

  return (
    <group ref={group}>
      <group ref={body}>
        <ToonMesh
          geometry="capsule"
          color={colors.suit}
          radius={0.12}
          height={0.28}
          position={[-0.12, 0.28, 0]}
          outline={0.05}
        />
        <ToonMesh
          geometry="capsule"
          color={colors.suit}
          radius={0.12}
          height={0.28}
          position={[0.12, 0.28, 0]}
          outline={0.05}
        />
        <ToonMesh
          geometry="box"
          color={colors.suit}
          width={0.55}
          height={0.55}
          depth={0.35}
          position={[0, 0.7, 0]}
          outline={0.045}
        />
        <ToonMesh
          geometry="box"
          color={colors.accent}
          width={0.35}
          height={0.3}
          depth={0.12}
          position={[0, 0.75, -0.22]}
          outline={0.04}
        />
        <ToonMesh
          geometry="sphere"
          color={PALETTE.cream}
          radius={0.28}
          position={[0, 1.15, 0]}
          outline={0.05}
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
    </group>
  );
}
