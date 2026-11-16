import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import floorData from "./floors/greenhouse.json";
import { prefersReducedMotion } from "../world3d/reducedMotion";

const MAX_PARALLAX_DEG = 6;
const DISP_SCALE = 0.85;

type FloorJson = typeof floorData;

function uvToWorld(
  uv: [number, number],
  worldW: number,
  worldD: number,
): THREE.Vector3 {
  // Painting UV: v=0 top (far), v=1 bottom (near / toward camera at +Z)
  const x = (uv[0] - 0.5) * worldW;
  const z = (uv[1] - 0.35) * worldD;
  return new THREE.Vector3(x, 0, z);
}

function pointInPoly(
  x: number,
  z: number,
  poly: [number, number][],
  worldW: number,
  worldD: number,
) {
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
    () => new THREE.PlaneGeometry(worldW, worldH, 160, 88),
    [worldW, worldH],
  );

  return (
    <mesh
      geometry={geo}
      // Push painting back so walk space (+Z) stays clear of displacement
      position={[0, worldH * 0.42, -2.2]}
      castShadow={false}
      receiveShadow={false}
    >
      {/* Unlit painting: emissive carries the art; displacement from depth PNG */}
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

function ParallaxCamera({ pointer }: { pointer: { x: number; y: number } }) {
  const { camera } = useThree();
  useFrame(() => {
    const reduce = prefersReducedMotion();
    const max = THREE.MathUtils.degToRad(MAX_PARALLAX_DEG);
    const tx = reduce ? 0 : pointer.x * max;
    const ty = reduce ? 0 : -pointer.y * max * 0.55;
    const sway = reduce ? 0 : Math.sin(performance.now() * 0.00045) * 0.05;
    const desired = new THREE.Vector3(
      Math.sin(tx) * 1.35 + sway,
      1.35 + Math.sin(ty) * 0.55,
      8.8,
    );
    camera.position.lerp(desired, 0.1);
    camera.lookAt(0, 1.15, 0);
  });
  return null;
}

function WalkController({
  floor,
  position,
  setMoving,
  setYawSign,
}: {
  floor: FloorJson;
  position: THREE.Vector3;
  setMoving: (m: boolean) => void;
  setYawSign: (s: number) => void;
}) {
  const keys = useRef<Record<string, boolean>>({});
  const target = useRef<THREE.Vector3 | null>(null);
  const [w, d] = floor.worldSize as [number, number];
  const poly = floor.floorPolygonUv as [number, number][];

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

  useFrame((_, dt) => {
    let mx = 0;
    let mz = 0;
    const k = keys.current;
    if (k.KeyW || k.ArrowUp) mz -= 1;
    if (k.KeyS || k.ArrowDown) mz += 1;
    if (k.KeyA || k.ArrowLeft) mx -= 1;
    if (k.KeyD || k.ArrowRight) mx += 1;

    const wish = new THREE.Vector3();
    if (mx || mz) wish.set(mx, 0, mz).normalize();
    else if (target.current) {
      wish.copy(target.current).sub(position);
      wish.y = 0;
      if (wish.lengthSq() < 0.02) target.current = null;
      else wish.normalize();
    }

    const moving = wish.lengthSq() > 0.01;
    setMoving(moving);
    if (!moving) return;
    if (Math.abs(wish.x) > 0.01) setYawSign(wish.x < 0 ? -1 : 1);
    const next = position.clone().addScaledVector(wish, 2.6 * dt);
    if (pointInPoly(next.x, next.z, poly, w, d)) position.copy(next);
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.01, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        const p = new THREE.Vector3(e.point.x, 0, e.point.z);
        if (pointInPoly(p.x, p.z, poly, w, d)) target.current = p;
      }}
    >
      <planeGeometry args={[w * 1.2, d * 1.2]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

function SceneInner({ pointer }: { pointer: { x: number; y: number } }) {
  const floor = floorData;
  const [w, d] = floor.worldSize as [number, number];
  const aspectH = (w * 768) / 1408;
  const spawn = uvToWorld(floor.spawnUv as [number, number], w, d);
  const pos = useRef(spawn.clone());
  const [moving, setMoving] = useState(false);
  const [yawSign, setYawSign] = useState(1);

  const tray = floor.billboards.find((b) => b.id === "plant_tray_left_front")!;
  const trayPos = uvToWorld(tray.uv as [number, number], w, d);

  // Nova scale shrinks as she walks deeper (smaller z)
  const novaScale = 0.95 + Math.max(0, Math.min(1, pos.current.z / 5)) * 0.35;

  return (
    <>
      <color attach="background" args={["#f3ebe0"]} />
      <ambientLight intensity={1} />
      <ParallaxCamera pointer={pointer} />
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
      <WalkController
        floor={floor}
        position={pos.current}
        setMoving={setMoving}
        setYawSign={setYawSign}
      />
      <PlantTrayOccluder position={trayPos} scale={tray.scale} />
      <NovaWalker
        position={pos.current}
        scale={Math.max(1.15, novaScale)}
        moving={moving}
        yawSign={yawSign}
      />
    </>
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
      {moving && !prefersReducedMotion() ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0.15]}>
          <circleGeometry args={[0.1, 8]} />
          <meshBasicMaterial color="#d4c4b0" transparent opacity={0.4} />
        </mesh>
      ) : null}
    </group>
  );
}

function PlantTrayOccluder({
  position,
  scale,
}: {
  position: THREE.Vector3;
  scale: number;
}) {
  const tex = useLoader(
    THREE.TextureLoader,
    "/art/cutouts/greenhouse-plant-tray-proxy.png",
  );
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

/** Greenhouse depth-painting demo only. Open `/?depth=greenhouse`. */
export function GreenhouseDepthScene() {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const dpr = Math.min(
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
    2,
  );

  return (
    <div
      id="greenhouse-depth-demo"
      style={{
        width: 1280,
        height: 720,
        maxWidth: "100%",
        margin: "0 auto",
        borderRadius: 12,
        overflow: "hidden",
        background: "#f3ebe0",
        position: "relative",
        boxShadow: "0 8px 28px rgba(58,51,72,0.12)",
      }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPointer({
          x: ((e.clientX - r.left) / r.width) * 2 - 1,
          y: ((e.clientY - r.top) / r.height) * 2 - 1,
        });
      }}
    >
      <Canvas
        dpr={dpr}
        camera={{ fov: 36, near: 0.1, far: 50, position: [0, 1.35, 8.8] }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <Suspense fallback={null}>
          <SceneInner pointer={pointer} />
        </Suspense>
      </Canvas>
      <p
        style={{
          position: "absolute",
          left: 12,
          bottom: 10,
          margin: 0,
          padding: "8px 12px",
          background: "#fff8ef",
          borderRadius: 8,
          fontFamily: "Nunito, sans-serif",
          fontSize: 13,
          color: "#3a3348",
          pointerEvents: "none",
          maxWidth: "70%",
        }}
      >
        Greenhouse depth demo — WASD or tap the path · walk behind the plant tray
        · pointer parallax (max 6°) · no gameplay
      </p>
    </div>
  );
}
