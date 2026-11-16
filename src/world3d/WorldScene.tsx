import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WorldLights } from "./Lights";
import { FollowCamera } from "./FollowCamera";
import { PlayerController } from "./PlayerController";
import {
  SurfaceRoom,
  surfaceBounds,
  surfaceSolids,
} from "./rooms/SurfaceRoom";
import {
  InteriorRoom,
  interiorBounds,
  interiorSolids,
} from "./rooms/InteriorRoom";
import type { PlaceId3d } from "./palette";
import { PALETTE } from "./palette";

type Props = {
  place: PlaceId3d;
  onPlaceChange: (p: PlaceId3d) => void;
  fading: boolean;
};

/**
 * One place at a time. Parent handles 0.4s fade between places.
 */
export function WorldScene({ place, onPlaceChange, fading }: Props) {
  const spawn = useMemo(() => {
    if (place === "surface") return new THREE.Vector3(0, 0, 12);
    return new THREE.Vector3(0, 0, 3);
  }, [place]);

  const pos = useRef(spawn.clone());
  const camTarget = useRef(new THREE.Vector3(spawn.x, 0.5, spawn.z));

  useEffect(() => {
    pos.current.copy(spawn);
    camTarget.current.set(spawn.x, 0.5, spawn.z);
  }, [spawn]);

  useFrame(() => {
    camTarget.current.set(pos.current.x, 0.5, pos.current.z);
  });

  const bounds = place === "surface" ? surfaceBounds() : interiorBounds();
  const solids = place === "surface" ? surfaceSolids() : interiorSolids();

  return (
    <>
      <color
        attach="background"
        args={[place === "surface" ? PALETTE.skyDay : "#2a2420"]}
      />
      <fog
        attach="fog"
        args={[place === "surface" ? PALETTE.skyDay : "#2a2420", 40, 90]}
      />
      <WorldLights night={false} />
      <FollowCamera target={camTarget.current} />

      <PlayerController
        position={pos.current}
        bounds={bounds}
        solids={solids}
        locked={fading}
      />

      {place === "surface" ? (
        <SurfaceRoom
          playerPos={pos.current}
          onDoor={(p) => onPlaceChange(p)}
        />
      ) : (
        <InteriorRoom
          place={place}
          playerPos={pos.current}
          cameraPos={camTarget.current}
          onExit={() => onPlaceChange("surface")}
        />
      )}
    </>
  );
}
