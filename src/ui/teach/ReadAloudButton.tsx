import { useEffect, useState } from "react";

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
    };
  }, [supported]);

  if (!supported) return null;

  const toggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  return (
    <button type="button" className="btn ghost read-aloud" onClick={toggle}>
      {speaking ? "Stop" : label}
    </button>
  );
}
