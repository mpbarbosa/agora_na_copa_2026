import { Mic, MicOff } from "lucide-react";

interface MatchSpeechToggleProps {
  enabled: boolean;
  onToggle: () => void;
  theme: "classic-light" | "stadium-dark";
}

/**
 * "Narração" mute/unmute control for live-match speech, surfaced on the scoreboard.
 * Icon-only (microphone): an active mic when narration is on, a muted mic when off.
 * Rendered only when the browser supports the Web Speech API (the caller gates on
 * `supported`).
 */
export function MatchSpeechToggle({ enabled, onToggle, theme }: MatchSpeechToggleProps) {
  const isLight = theme === "classic-light";
  const tone = enabled
    ? isLight
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
    : isLight
      ? "border-slate-300 bg-slate-50 text-slate-600"
      : "border-white/15 bg-white/5 text-slate-300";

  const label = enabled ? "Desativar a narração dos lances" : "Ativar a narração dos lances";
  const Icon = enabled ? Mic : MicOff;

  return (
    <button
      type="button"
      id="btn-toggle-narration"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center rounded-lg border p-2 transition ${tone}`}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
