import { useEffect, useMemo, useState } from "react";
import type { BridgeDelta } from "../game/bridge";
import { clipWords, consequenceNovaLine } from "../game/novaTalk";
import { audio } from "../audio/audio";
import { prefersReducedMotion } from "../world3d/reducedMotion";
import "./interactives/depthInteract.css";

const ICONS: Record<string, string> = {
  water: "💧",
  oxygen: "O₂",
  battery: "⚡",
  materials: "📦",
  exposure: "⚠",
  science: "🔬",
};

type Props = {
  deltas: BridgeDelta[];
  onContinue: () => void;
};

/**
 * ~8s consequence beat after bed: floaters → Nova line → 3-icon summary.
 * No scrolling. ≤25 words on screen at once.
 */
export function ConsequenceScene({ deltas, onContinue }: Props) {
  const changed = useMemo(
    () => deltas.filter((d) => d.after !== d.before).slice(0, 3),
    [deltas],
  );
  const [phase, setPhase] = useState<"title" | "floats" | "nova" | "summary" | "ready">(
    "title",
  );
  const [floaters, setFloaters] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const reduce = prefersReducedMotion();
  const nova = useMemo(() => consequenceNovaLine(changed), [changed]);

  useEffect(() => {
    audio.play("dayJingle");
    const timers: number[] = [];
    const ms = (n: number, fn: () => void) => {
      timers.push(window.setTimeout(fn, reduce ? Math.min(n, 200) : n));
    };
    ms(200, () => setPhase("floats"));
    changed.forEach((d, i) => {
      ms(400 + i * 500, () => {
        const delta = d.after - d.before;
        const label = `${ICONS[d.key] ?? ""} ${delta > 0 ? "+" : ""}${
          Number.isInteger(delta) ? delta : delta.toFixed(1)
        }`;
        setFloaters((prev) => [...prev, label]);
        audio.play(delta >= 0 ? "resourceUp" : "resourceDown");
      });
    });
    ms(3200, () => setPhase("nova"));
    ms(5500, () => setPhase("summary"));
    ms(7500, () => {
      setPhase("ready");
      setReady(true);
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [changed, reduce]);

  // One text line at a time so ≤25 words stay on screen.
  const line =
    phase === "title" || phase === "floats"
      ? clipWords("Night falls. Here's what changed.")
      : phase === "nova"
        ? nova
        : ready
          ? clipWords("Tap to continue")
          : clipWords("Today's changes");

  return (
    <div
      className="depth-consequence"
      role="dialog"
      aria-label="Day consequence"
      onClick={() => {
        if (!ready) return;
        audio.play("uiClick");
        onContinue();
      }}
    >
      <p className="depth-consequence__title">{line}</p>

      {(phase === "floats" || phase === "nova") && (
        <div className="depth-consequence__floats" aria-hidden>
          {floaters.map((f) => (
            <span key={f} className="depth-consequence__float">
              {f}
            </span>
          ))}
        </div>
      )}

      {(phase === "summary" || phase === "ready") && (
        <div className="depth-consequence__icons">
          {changed.map((d) => {
            const delta = d.after - d.before;
            return (
              <span key={d.key} className="depth-consequence__icon">
                {ICONS[d.key] ?? "·"}
                <br />
                {delta > 0 ? "+" : ""}
                {Number.isInteger(delta) ? delta : delta.toFixed(0)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
