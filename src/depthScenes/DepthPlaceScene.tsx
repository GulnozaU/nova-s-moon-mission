import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { prefersReducedMotion } from "../world3d/reducedMotion";
import {
  WALK_SPEED,
  nearDoor,
  pointInPoly,
  uvToWorld,
} from "./math";
import type { FloorDef, PlaceId } from "./types";

const MAX_PARALLAX_DEG = 6;
const DISP_SCALE = 0.85;

type WalkApi = {
  setTarget: (p: THREE.Vector3 | null) => void;
  getPosition: () => THREE.Vector3;
};

export type DepthPlaceSceneProps = {
  floor: FloorDef;
  pointer: { x: number; y: number };
  fading: boolean;
  /** HUD / door destination; scene walks toward matching door. */
  navigateTo: PlaceId | null;
  onReachedDoor: (to: PlaceId) => void;
  walkApiRef: MutableRefObject<WalkApi | null>;
  /** Live Nova world position for USE-range checks. */
  novaPosRef: MutableRefObject<THREE.Vector3>;
  interactives?: ReactNode;
  /** Plain-site night or storm dim. */
  isNight?: boolean;
  stormToday?: boolean;
  /** Brief flash / shake from storm FX. */
  stormPulse?: number;
};

function DepthPainting({
  paintingUrl,
  depthUrl,
  worldW,
  worldH,
}: {
  paintingUrl: string;
  depthUrl: string;
  worldW: number;
  worldH: number;
}) {
  const colorMap = useLoader(THREE.TextureLoader, paintingUrl);
  const depthMap = useLoader(THREE.TextureLoader, depthUrl);

  useMemo(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace;
    colorMap.wrapS = colorMap.wrapT = THREE.ClampToEdgeWrapping;
    depthMap.wrapS = depthMap.wrapT = THREE.ClampToEdgeWrapping;
    for (const t of [colorMap, depthMap]) {
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
    }
  }, [colorMap, depthMap]);

  const geo = useMemo(
    () => new THREE.PlaneGeometry(worldW, worldH, 128, 72),
    [worldW, worldH],
  );

  return (
    <mesh geometry={geo} position={[0, worldH * 0.42, -2.2]}>
      <meshStandardMaterial
        color="#000000"
        map={colorMap}
        emissiveMap={colorMap}
        emissive="#ffffff"
        emissiveIntensity={1}
        displacementMap={depthMap}
        displacementScale={DISP_SCALE}
        displacementBias={-0.4}
        roughness={1}
        metalness={0}
        toneMapped={false}
        flatShading
      />
    </mesh>
  );
}

function EdgeClampBackdrop({
  paintingUrl,
  worldW,
  worldH,
}: {
  paintingUrl: string;
  worldW: number;
  worldH: number;
}) {
  const map = useLoader(THREE.TextureLoader, paintingUrl);
  useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  }, [map]);
  return (
    <mesh position={[0, worldH * 0.42, -3.1]} scale={[1.16, 1.16, 1]}>
      <planeGeometry args={[worldW, worldH]} />
      <meshBasicMaterial
        map={map}
        toneMapped={false}
        transparent
        opacity={0.45}
      />
    </mesh>
  );
}

function FollowParallaxCamera({
  pointer,
  follow,
  stormPulse = 0,
}: {
  pointer: { x: number; y: number };
  follow: THREE.Vector3;
  stormPulse?: number;
}) {
  const { camera } = useThree();
  useFrame(() => {
    const reduce = prefersReducedMotion();
    const max = THREE.MathUtils.degToRad(MAX_PARALLAX_DEG);
    const tx = reduce ? 0 : pointer.x * max;
    const ty = reduce ? 0 : -pointer.y * max * 0.55;
    const sway = reduce ? 0 : Math.sin(performance.now() * 0.00045) * 0.04;
    const shake =
      !reduce && stormPulse > 0
        ? Math.sin(performance.now() * 0.05) * 0.08 * Math.min(1, stormPulse)
        : 0;
    const desired = new THREE.Vector3(
      follow.x * 0.35 + Math.sin(tx) * 1.2 + sway + shake,
      1.35 + Math.sin(ty) * 0.5,
      8.8 + follow.z * 0.08,
    );
    camera.position.lerp(desired, reduce ? 1 : 0.08);
    camera.lookAt(follow.x * 0.25, 1.15, follow.z * 0.15);
  });
  return null;
}

function DoorMarker({
  position,
  label,
  opening,
}: {
  position: THREE.Vector3;
  label: string;
  opening?: boolean;
}) {
  const reduce = prefersReducedMotion();
  const pulse = useRef(0);
  const mesh = useRef<THREE.Mesh>(null);
  const panel = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    pulse.current += dt;
    if (!mesh.current || reduce) return;
    const s = 1 + Math.sin(pulse.current * 3) * 0.08;
    mesh.current.scale.set(s, 1, s);
    if (panel.current) {
      const open = opening ? Math.min(1, pulse.current * 2) : 0.15;
      panel.current.rotation.y = -open * 1.1;
    }
  });
  return (
    <group position={[position.x, 0.02, position.z]}>
      <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.55, 24]} />
        <meshBasicMaterial color="#e8c96a" transparent opacity={0.85} />
      </mesh>
      <mesh ref={panel} position={[0.2, 0.9, 0]}>
        <planeGeometry args={[0.55, 1.1]} />
        <meshBasicMaterial color="#c9a227" transparent opacity={0.55} />
      </mesh>
      <group userData={{ doorLabel: label }} />
    </group>
  );
}

function NovaWalker({
  position,
  scale,
  moving,
  yawSign,
}: {
  position: THREE.Vector3;
  scale: number;
  moving: boolean;
  yawSign: number;
}) {
  const tex = useLoader(
    THREE.TextureLoader,
    "/art/cutouts/nova-astronaut-boy.png",
  );
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
  }, [tex]);
  useFrame((_, dt) => {
    if (!group.current) return;
    t.current += dt;
    const reduce = prefersReducedMotion();
    let bob = 0;
    let squash = 1;
    let tilt = 0;
    if (moving && !reduce) {
      bob = Math.sin(t.current * 11) * 0.05;
      squash = 1 + Math.sin(t.current * 11) * 0.05;
      tilt = yawSign * 0.08;
    } else if (!reduce) {
      bob = Math.sin(t.current * 2.1) * 0.02;
    }
    group.current.position.set(position.x, 0.55 * scale + bob, position.z);
    group.current.scale.set(yawSign < 0 ? -scale : scale, squash * scale, 1);
    group.current.rotation.z = tilt;
  });
  return (
    <group ref={group} renderOrder={6}>
      <mesh renderOrder={6}>
        <planeGeometry args={[1.0, 1.15]} />
        <meshBasicMaterial
          map={tex}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
          alphaTest={0.05}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.52, 0.02]}>
        <circleGeometry args={[0.22, 12]} />
        <meshBasicMaterial color="#000" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

function Billboard({
  url,
  position,
  scale,
}: {
  url: string;
  position: THREE.Vector3;
  scale: number;
}) {
  const tex = useLoader(THREE.TextureLoader, url);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
  }, [tex]);
  return (
    <mesh
      position={[position.x, scale * 0.45, position.z]}
      renderOrder={2}
      scale={[scale, scale, 1]}
    >
      <planeGeometry args={[1.2, 1]} />
      <meshBasicMaterial
        map={tex}
        transparent
        depthWrite
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function DepthPlaceScene({
  floor,
  pointer,
  fading,
  navigateTo,
  onReachedDoor,
  walkApiRef,
  novaPosRef,
  interactives,
  isNight = false,
  stormToday = false,
  stormPulse = 0,
}: DepthPlaceSceneProps) {
  const [w, d] = floor.worldSize;
  const aspectH = (w * floor.paintingSize[1]) / floor.paintingSize[0];
  const pos = useRef(uvToWorld(floor.spawnUv, w, d));
  const keys = useRef<Record<string, boolean>>({});
  const target = useRef<THREE.Vector3 | null>(null);
  const [moving, setMoving] = useState(false);
  const [yawSign, setYawSign] = useState(1);
  const doorCooldown = useRef(0);
  const lastDoorTo = useRef<PlaceId | null>(null);
  const onDoorRef = useRef(onReachedDoor);
  onDoorRef.current = onReachedDoor;

  useEffect(() => {
    pos.current.copy(uvToWorld(floor.spawnUv, w, d));
    target.current = null;
    doorCooldown.current = 0.35;
    lastDoorTo.current = null;
  }, [floor.id, floor.spawnUv, w, d]);

  useEffect(() => {
    walkApiRef.current = {
      setTarget: (p) => {
        target.current = p;
      },
      getPosition: () => pos.current,
    };
    novaPosRef.current.copy(pos.current);
    return () => {
      walkApiRef.current = null;
    };
  }, [walkApiRef, novaPosRef]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      target.current = null;
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

  // HUD auto-walk: aim at the door that leads toward navigateTo.
  useEffect(() => {
    if (!navigateTo || navigateTo === floor.id) return;
    const door =
      floor.doors.find((dr) => dr.to === navigateTo) ??
      floor.doors.find((dr) => dr.to === "surface") ??
      floor.doors[0];
    if (!door) return;
    target.current = uvToWorld(door.uv, w, d);
  }, [navigateTo, floor, w, d]);

  useFrame((_, dt) => {
    if (fading) {
      setMoving(false);
      return;
    }
    doorCooldown.current = Math.max(0, doorCooldown.current - dt);

    let mx = 0;
    let mz = 0;
    const k = keys.current;
    if (k.KeyW || k.ArrowUp) mz -= 1;
    if (k.KeyS || k.ArrowDown) mz += 1;
    if (k.KeyA || k.ArrowLeft) mx -= 1;
    if (k.KeyD || k.ArrowRight) mx += 1;

    const wish = new THREE.Vector3();
    if (mx || mz) {
      wish.set(mx, 0, mz).normalize();
      target.current = null;
    } else if (target.current) {
      wish.copy(target.current).sub(pos.current);
      wish.y = 0;
      if (wish.lengthSq() < 0.04) target.current = null;
      else wish.normalize();
    }

    const isMoving = wish.lengthSq() > 0.01;
    setMoving(isMoving);
    if (isMoving) {
      if (Math.abs(wish.x) > 0.01) setYawSign(wish.x < 0 ? -1 : 1);
      const next = pos.current.clone().addScaledVector(wish, WALK_SPEED * dt);
      if (pointInPoly(next.x, next.z, floor.floorPolygonUv, w, d)) {
        pos.current.copy(next);
      } else {
        // Axis slide for soft collision against polygon walls
        const nx = pos.current.clone();
        nx.x = next.x;
        if (pointInPoly(nx.x, nx.z, floor.floorPolygonUv, w, d)) {
          pos.current.copy(nx);
        } else {
          const nz = pos.current.clone();
          nz.z = next.z;
          if (pointInPoly(nz.x, nz.z, floor.floorPolygonUv, w, d)) {
            pos.current.copy(nz);
          }
        }
      }
    }
    novaPosRef.current.copy(pos.current);

    if (doorCooldown.current > 0) return;
    const hit = nearDoor(pos.current.x, pos.current.z, floor);
    if (hit && hit.to !== floor.id && lastDoorTo.current !== hit.to) {
      lastDoorTo.current = hit.to;
      onDoorRef.current(hit.to);
    }
  });

  const novaScale =
    0.95 + Math.max(0, Math.min(1, pos.current.z / 5)) * 0.35;
  const sky = stormToday
    ? "#2a2430"
    : isNight
      ? "#1c2438"
      : "#f3ebe0";
  const amb = stormToday ? 0.55 : isNight ? 0.45 : 1;

  return (
    <>
      <color attach="background" args={[sky]} />
      <ambientLight intensity={amb} />
      {isNight || stormToday ? (
        <directionalLight
          intensity={stormToday ? 0.35 : 0.25}
          position={[2, 4, 3]}
          color={stormToday ? "#c9b8ff" : "#8fb4c9"}
        />
      ) : (
        <directionalLight intensity={0.4} position={[1, 5, 2]} color="#fff4e0" />
      )}
      <FollowParallaxCamera
        pointer={pointer}
        follow={pos.current}
        stormPulse={stormPulse}
      />
      <EdgeClampBackdrop
        paintingUrl={floor.painting}
        worldW={w}
        worldH={aspectH}
      />
      <DepthPainting
        paintingUrl={floor.painting}
        depthUrl={floor.depth}
        worldW={w}
        worldH={aspectH}
      />
      {floor.doors.map((door) => (
        <DoorMarker
          key={door.id}
          position={uvToWorld(door.uv, w, d)}
          label={door.label}
          opening={fading || navigateTo === door.to}
        />
      ))}
      {(floor.billboards ?? []).map((b) =>
        b.url ? (
          <Billboard
            key={b.id}
            url={b.url}
            position={uvToWorld(b.uv, w, d)}
            scale={b.scale}
          />
        ) : null,
      )}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          const p = new THREE.Vector3(e.point.x, 0, e.point.z);
          if (pointInPoly(p.x, p.z, floor.floorPolygonUv, w, d)) {
            target.current = p;
          }
        }}
      >
        <planeGeometry args={[w * 1.25, d * 1.25]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <NovaWalker
        position={pos.current}
        scale={Math.max(1.15, novaScale)}
        moving={moving}
        yawSign={yawSign}
      />
      {interactives}
    </>
  );
}
