import { GameApp } from "./ui/GameApp";
import { GreenhouseDepthScene } from "./depthScenes/GreenhouseDepthScene";

/** `?depth=greenhouse` → depth-painting demo only (no gameplay). */
function depthMode(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("depth");
}

export default function App() {
  if (depthMode() === "greenhouse") {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f3ebe0",
          padding: "24px 16px 40px",
          boxSizing: "border-box",
        }}
      >
        <h1
          style={{
            fontFamily: '"Baloo 2", Nunito, sans-serif',
            color: "#3a3348",
            textAlign: "center",
            fontSize: 28,
            margin: "0 0 8px",
          }}
        >
          Greenhouse depth scene
        </h1>
        <p
          style={{
            fontFamily: "Nunito, sans-serif",
            color: "#6a6278",
            textAlign: "center",
            margin: "0 0 20px",
            fontSize: 14,
          }}
        >
          Approval demo — painting + Depth Anything V2 Small displacement. No
          gameplay.
        </p>
        <GreenhouseDepthScene />
      </main>
    );
  }
  return <GameApp />;
}
