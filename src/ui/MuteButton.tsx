import { useEffect, useState } from "react";
import { audio } from "../audio/audio";

/** Top-right mute control; persists via localStorage. */
export function MuteButton() {
  const [, tick] = useState(0);
  useEffect(() => audio.subscribe(() => tick((n) => n + 1)), []);

  const muted = audio.isMuted();
  return (
    <button
      type="button"
      className={`btn ghost mute-btn${muted ? " is-muted" : ""}`}
      aria-pressed={muted}
      aria-label={muted ? "Unmute sounds" : "Mute sounds"}
      title={muted ? "Unmute" : "Mute"}
      onClick={() => {
        audio.unlock();
        audio.toggleMute();
        audio.play("uiClick");
      }}
      onMouseEnter={() => audio.play("uiHover")}
    >
      {muted ? "Muted" : "Sound"}
    </button>
  );
}
