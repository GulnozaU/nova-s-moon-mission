import { PALETTE } from "./palette";

/** One hemisphere + one soft directional. Blob shadows via castShadow on key light. */
export function WorldLights({ night = false }: { night?: boolean }) {
  return (
    <>
      <hemisphereLight
        args={[
          night ? PALETTE.lavender : PALETTE.skyDay,
          night ? "#1a1820" : PALETTE.moonDust,
          night ? 0.55 : 0.85,
        ]}
      />
      <directionalLight
        castShadow
        position={[12, 18, 8]}
        intensity={night ? 0.35 : 0.75}
        color={night ? PALETTE.lavender : PALETTE.cream}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0002}
      />
      <ambientLight intensity={0.15} />
    </>
  );
}
