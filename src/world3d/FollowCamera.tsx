import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { prefersReducedMotion } from "./reducedMotion";

type Props = {
  target: THREE.Vector3;
};

/**
 * Fixed 3/4 follow (~45°). Smooth lerp. No free orbit.
 */
export function FollowCamera({ target }: Props) {
  const { camera } = useThree();
  const offset = useRef(new THREE.Vector3(10, 12, 10));
  const look = useRef(new THREE.Vector3());
  const pos = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const desired = pos.current.copy(target).add(offset.current);
    const smooth = prefersReducedMotion() ? 1 : Math.min(1, dt * 4);
    camera.position.lerp(desired, smooth);
    look.current.lerp(target, smooth);
    camera.lookAt(look.current.x, look.current.y + 0.6, look.current.z);
  });

  return null;
}
