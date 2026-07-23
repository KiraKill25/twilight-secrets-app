import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { audio } from "@/lib/audio";

export function SoundToggle({ autoStart = false }: { autoStart?: boolean }) {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const enabled = audio.isEnabled();
    setOn(enabled);
    if (enabled && autoStart) audio.startAmbient();
  }, [autoStart]);

  const toggle = async () => {
    const next = !on;
    setOn(next);
    audio.setEnabled(next);
    if (next) await audio.startAmbient();
  };

  return (
    <button
      onClick={toggle}
      aria-label={on ? "Mute" : "Unmute"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/60 text-foreground backdrop-blur-md transition-colors hover:bg-card"
    >
      {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 opacity-60" />}
    </button>
  );
}
