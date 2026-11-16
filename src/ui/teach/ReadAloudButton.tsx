import { useEffect, useState } from "react";
import { audio } from "../../audio/audio";

type Props = {
  text: string;
  label?: string;
};

/** Browser speechSynthesis only — no account, no external API (SPEC 6c). */
export function ReadAloudButton({ text, label = "Read aloud" }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
      audio.setSpeechDuck(false);
    };
  }, [supported]);

  if (!supported) return null;

  const toggle = () => {
    audio.unlock();
    audio.play("uiClick");
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      audio.setSpeechDuck(false);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onend = () => {
      setSpeaking(false);
      audio.setSpeechDuck(false);
    };
    u.onerror = () => {
      setSpeaking(false);
      audio.setSpeechDuck(false);
    };
    setSpeaking(true);
    audio.setSpeechDuck(true);
    window.speechSynthesis.speak(u);
  };

  return (
    <button
      type="button"
      className="btn ghost read-aloud"
      onClick={toggle}
      onMouseEnter={() => audio.play("uiHover")}
    >
      {speaking ? "Stop" : label}
    </button>
  );
}
