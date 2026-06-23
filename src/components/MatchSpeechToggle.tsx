interface MatchSpeechToggleProps {
  enabled: boolean;
  onToggle: () => void;
  theme: "classic-light" | "stadium-dark";
}

/**
 * "Narração" mute/unmute control for live-match speech, shown in the clock-setup
 * drawer. Rendered only when the browser supports the Web Speech API (the caller
 * gates on `supported`).
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

  return (
    <button
      type="button"
      id="btn-toggle-narration"
      onClick={onToggle}
      aria-pressed={enabled}
      title={enabled ? "Desativar a narração dos lances" : "Ativar a narração dos lances"}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider transition ${tone}`}
    >
      <span aria-hidden="true">{enabled ? "🔊" : "🔇"}</span>
      <span>Narração</span>
      <span className="opacity-80">{enabled ? "ON" : "OFF"}</span>
    </button>
  );
}
