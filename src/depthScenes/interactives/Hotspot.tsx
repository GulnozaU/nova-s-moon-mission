import { useMemo, useRef, useState } from "react";
import { Html, useCursor } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { prefersReducedMotion } from "../../world3d/reducedMotion";
import { uvToWorld } from "../math";
import type { FloorDef } from "../types";
import type { DragPayload, InteractiveDef, PlaceFx } from "./types";
import type { DayDecisions } from "../../engine/types";

type Props = {
  def: InteractiveDef;
  floor: FloorDef;
  decisions: DayDecisions;
  fx: PlaceFx;
  active: boolean;
  drag: DragPayload | null;
  novaNear: boolean;
  onActivate: (def: InteractiveDef) => void;
  onHover: (def: InteractiveDef | null) => void;
};

export function Hotspot({
  def,
  floor,
  decisions,
  fx,
  active,
  drag,
  novaNear,
  onActivate,
  onHover,
}: Props) {
  const [w, d] = floor.worldSize;
  const pos = useMemo(() => uvToWorld(def.uv, w, d), [def.uv, w, d]);
  const isSvg = def.cutout.endsWith(".svg");
  // PNGs via GPU texture; SVGs via DOM <img> (TextureLoader is unreliable on SVG).
  const tex = useLoader(
    THREE.TextureLoader,
    isSvg
      ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
      : def.cutout,
  );
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
  }, [tex]);
  const trayIdx = def.id.startsWith("gh_tray_") ? Number(def.id.slice(-1)) : -1;
  const trayStage = trayIdx >= 0 ? (fx.plantStage[trayIdx] ?? 0) : 0;
  const trayWilt = trayIdx >= 0 ? Boolean(fx.plantWilt[trayIdx]) : false;

  const group = useRef<THREE.Group>(null);
  const outline = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const on =
    (def.id === "surface_radio" && decisions.comms) ||
    (def.id === "home_recycler" && decisions.recycler) ||
    (def.id === "home_air" && decisions.oxygenMaker) ||
    (def.id === "gh_light" && decisions.greenhouse) ||
    (def.id === "surface_shield" && decisions.buildShield) ||
    (def.id === "lab_analyzer" && fx.analyzerGlow) ||
    (def.id === "surface_solar" && decisions.cleanFilter);

  const dropOk =
    drag && def.accepts?.includes(drag.kind)
      ? true
      : drag && def.kind === "drop"
        ? false
        : drag &&
            (def.id === "surface_door_home" ||
              def.id === "surface_shelter" ||
              def.id === "home_shelter") &&
            (drag.kind === "crew" || drag.kind === "nova")
          ? true
          : drag
            ? false
            : null;

  const fillKey =
    def.id === "surface_radio"
      ? "radio"
      : def.id === "home_recycler"
        ? "recycler"
        : def.id === "home_air"
          ? "air"
          : def.id === "gh_light"
            ? "greenhouse"
            : def.id === "lab_analyzer"
              ? "analyzer"
              : def.id === "surface_solar"
                ? "solar"
                : null;
  const fillAmt = fillKey ? (fx.fills[fillKey] ?? 0) : 0;

  useFrame((state) => {
    if (!group.current) return;
    const reduce = prefersReducedMotion();
    const t = state.clock.elapsedTime;
    let y = def.scale * 0.42;
    let bob = 0;
    if (def.machine && !reduce) {
      bob = Math.sin(t * 2.2 + pos.x) * 0.04;
      if (on) bob += Math.sin(t * 6) * 0.02;
    }
    if (def.id === "surface_rover" && fx.roverTrip && !reduce) {
      const trip = (Math.sin(t * 1.5) + 1) * 0.5;
      group.current.position.set(pos.x + trip * 2.2, y + bob, pos.z - trip * 0.8);
    } else {
      group.current.position.set(pos.x, y + bob, pos.z);
    }
    if (outline.current) {
      // Hit-test highlight while dragging: green accept / red reject
      const show =
        hovered || active || (drag != null && hovered) || (dropOk === true && hovered);
      outline.current.visible = Boolean(show || (hovered && drag));
      const pulse = reduce ? 1 : 1 + Math.sin(t * 5) * 0.06;
      outline.current.scale.setScalar(show ? pulse * 1.08 : 1);
      const mat = outline.current.material as THREE.MeshBasicMaterial;
      if (hovered && dropOk === false) mat.color.set("#c45c5c");
      else if (hovered && dropOk === true) mat.color.set("#3bb273");
      else if (on) mat.color.set("#7dcea0");
      else mat.color.set("#e8c96a");
    }
    // Shield shimmer
    if (def.id === "surface_shield" && (decisions.buildShield || fx.shieldPulse > 0)) {
      const mat = (group.current.children[0] as THREE.Mesh)
        ?.material as THREE.MeshBasicMaterial | undefined;
      if (mat) mat.opacity = 0.75 + Math.sin(t * 8) * 0.2;
    }
  });

  const showTip = hovered || active;

  return (
    <group ref={group} position={[pos.x, def.scale * 0.42, pos.z]}>
      <mesh
        renderOrder={4}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(def);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onHover(null);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onActivate(def);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          if (drag) onActivate(def);
        }}
      >
        <planeGeometry args={[def.scale, def.scale]} />
        {isSvg ? (
          <meshBasicMaterial
            color={on ? "#d8eedc" : "#f5ead8"}
            transparent
            opacity={0.2}
            depthTest={false}
            depthWrite={false}
          />
        ) : (
          <meshBasicMaterial
            map={tex}
            transparent
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
            opacity={on ? 1 : 0.92}
          />
        )}
      </mesh>
      {isSvg ? (
        <Html
          center
          position={[0, 0, 0.02]}
          distanceFactor={7}
          style={{ pointerEvents: "none" }}
        >
          <img
            src={def.cutout}
            alt=""
            width={88}
            height={88}
            style={{
              display: "block",
              filter: on ? "saturate(1.2)" : undefined,
              transform: trayWilt ? "grayscale(0.6)" : undefined,
            }}
          />
        </Html>
      ) : null}
      <mesh ref={outline} renderOrder={5} visible={false}>
        <ringGeometry args={[def.scale * 0.42, def.scale * 0.52, 32]} />
        <meshBasicMaterial
          color="#e8c96a"
          transparent
          opacity={0.9}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {trayIdx >= 0 ? (
        <Html center position={[0, def.scale * 0.4, 0]} distanceFactor={10} style={{ pointerEvents: "none" }}>
          <span className={`depth-stage${trayWilt ? " is-wilt" : ""}`}>
            {trayWilt ? "wilt" : `stage ${trayStage}`}
          </span>
        </Html>
      ) : null}
      {fillAmt > 0 && !on ? (
        <Html center position={[0, -def.scale * 0.35, 0]} distanceFactor={10} style={{ pointerEvents: "none" }}>
          <span className="depth-fill-pip">{fillAmt} in</span>
        </Html>
      ) : null}
      {on ? (
        <Html center position={[0, -def.scale * 0.35, 0]} distanceFactor={10} style={{ pointerEvents: "none" }}>
          <span className="depth-fill-pip">ON</span>
        </Html>
      ) : null}
      {showTip ? (
        <Html
          center
          position={[0, def.scale * 0.65, 0]}
          distanceFactor={8}
          style={{ pointerEvents: "none" }}
          zIndexRange={[20, 0]}
        >
          <div className="depth-tip">
            <p className="depth-tip__title">{def.label}</p>
            <p className="depth-tip__kind">
              {def.kind === "drop"
                ? "DROP TARGET"
                : def.kind === "use"
                  ? "USE"
                  : "INFO"}
              {def.kind === "use" && !novaNear ? " · walk closer" : ""}
            </p>
            <div className="depth-tip__row">
              {def.costBenefit.costs.map((c) => (
                <span key={c} className="depth-tip__cost">
                  {c}
                </span>
              ))}
              {def.costBenefit.benefits.map((b) => (
                <span key={b} className="depth-tip__benefit">
                  {b}
                </span>
              ))}
            </div>
            {def.info ? (
              <p className="depth-tip__info">
                <span className={`depth-tip__badge badge-${def.info.badge}`}>
                  {def.info.badge}
                </span>{" "}
                {def.info.text}
              </p>
            ) : null}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
