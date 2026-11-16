import { useEffect, useRef } from "react";
import { audio } from "../audio/audio";
import { DEMO_SEED, type Phase } from "../ui/useGameSession";

type Props = {
  enabled: boolean;
  phase: Phase;
  setPhase: (p: Phase) => void;
  pickSite: (site: "rim" | "plain") => Promise<void>;
  setNovaLine: (line: string) => void;
};

/**
 * ?demo=1 — fixed seed (DEMO_SEED) and a short auto path for a ~30s video:
 * unlock audio → skip training → build at rim → live base (storm days from seed).
 * Operator records: storm banner, morning talk, one drag per place, bed → consequence → end.
 */
export function DemoDirector({
  enabled,
  phase,
  setPhase,
  pickSite,
  setNovaLine,
}: Props) {
  const ran = useRef(false);

  useEffect(() => {
    if (!enabled || ran.current) return;
    if (phase !== "welcome") return;
    ran.current = true;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, ms));
    };

    setNovaLine("Demo mode: fixed seed. Storm days use real NASA records.");
    later(500, () => {
      audio.unlock();
      audio.play("dayStart");
      setPhase("site");
    });
    later(1400, () => {
      void pickSite("rim");
      setNovaLine(
        `Demo seed ${DEMO_SEED}. Chip radio, visit rooms, bed for the night report.`,
      );
    });

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [enabled, phase, setPhase, pickSite, setNovaLine]);

  if (!enabled) return null;

  return (
    <p
      className="demo-banner"
      style={{
        position: "fixed",
        bottom: 8,
        left: 8,
        zIndex: 50,
        margin: 0,
        padding: "6px 10px",
        borderRadius: 8,
        background: "#fff8ef",
        border: "2px solid rgba(58,51,72,0.2)",
        fontFamily: "Nunito, sans-serif",
        fontSize: 12,
        color: "#3a3348",
        pointerEvents: "none",
        maxWidth: "90vw",
      }}
    >
      Demo · seed {DEMO_SEED} · storm banner, talk, drag, bed, report
    </p>
  );
}

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "1";
}
