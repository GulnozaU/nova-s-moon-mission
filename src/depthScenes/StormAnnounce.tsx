import { useEffect, useState } from "react";
import { audio } from "../audio/audio";
import { prefersReducedMotion } from "../world3d/reducedMotion";
import { clipWords } from "../game/novaTalk";
import "./interactives/depthInteract.css";

type Props = {
  /** Storm is on today's calendar. */
  stormToday: boolean;
  /** Radio-yesterday warning before the hit. */
  warningComing: boolean;
  daysUntil?: number;
};

/**
 * Announce "Storm is coming" on warning days; rumble + flash only on storm day.
 */
export function StormAnnounce({ stormToday, warningComing, daysUntil }: Props) {
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const reduce = prefersReducedMotion();

  // Warning banner + alert chirp (no rumble yet).
  useEffect(() => {
    if (!warningComing || stormToday) return;
    audio.play("stormAlert");
  }, [warningComing, stormToday]);

  // Storm day: gentle loop + periodic soft flashes.
  useEffect(() => {
    if (!stormToday) {
      audio.stopStormLoop();
      return;
    }
    audio.play("stormAlert");
    audio.play("stormRumble");
    audio.startStormLoop();
    const timers: number[] = [];
    const pulse = () => {
      setFlash(true);
      if (!reduce) setShake(true);
      audio.play("stormRumble");
      timers.push(
        window.setTimeout(() => {
          setFlash(false);
          setShake(false);
        }, reduce ? 120 : 450),
      );
    };
    pulse();
    const id = window.setInterval(pulse, reduce ? 8000 : 5200);
    return () => {
      window.clearInterval(id);
      timers.forEach((t) => window.clearTimeout(t));
      audio.stopStormLoop();
    };
  }, [stormToday, reduce]);

  if (!stormToday && !warningComing) return null;

  const line = stormToday
    ? clipWords("Storm is here! Shelter the crew.")
    : clipWords(
        daysUntil != null && daysUntil > 0
          ? `Storm is coming in ${daysUntil} day(s)!`
          : "Storm is coming!",
      );

  return (
    <div
      className={`depth-storm-banner${stormToday ? " is-storm" : " is-warn"}${
        shake ? " is-shake" : ""
      }${flash ? " is-flash" : ""}`}
      role="status"
      aria-live="polite"
    >
      <p>{line}</p>
      {flash ? <div className="depth-storm-flash" aria-hidden /> : null}
    </div>
  );
}
