// The "Mudar Relógio" setup drawer (Ao Vivo): narration/voice diagnostics + a
// test-voice button, the demo kickoff/countdown editor, and the live-match
// simulation controls (start / goal / card / finish / reset). Presentational —
// the parent owns the clock + simulation state and passes handlers in; only the
// transient "test voice" status readout is local here.
import { useState } from "react";
import { useT } from "../i18n";
import { runDirectSpeechTest } from "../utils/speech/catasSpeech";
import { formatCountdown } from "../utils/matchClock";
import type { MatchSpeechControls } from "../hooks/useMatchSpeech";
import { Edit3, Mic, CircleDot, Goal, ShieldAlert } from "lucide-react";

interface MatchClockConfigDrawerProps {
  theme: "classic-light" | "stadium-dark";
  matchSpeech: MatchSpeechControls;
  homeCode: string;
  awayCode: string;
  customKickoffTime: string;
  onKickoffTimeChange: (value: string) => void;
  customCountdownSeconds: number;
  onCountdownSecondsChange: (value: number) => void;
  onApply: () => void;
  onClose: () => void;
  simulation: {
    onStartLive: () => void;
    onGoal: (team: "A" | "B") => void;
    onCard: (type: "YELLOW_CARD" | "RED_CARD", team: "A" | "B") => void;
    onFinish: () => void;
    onReset: () => void;
  };
}

export function MatchClockConfigDrawer({
  matchSpeech,
  homeCode,
  awayCode,
  customKickoffTime,
  onKickoffTimeChange,
  customCountdownSeconds,
  onCountdownSecondsChange,
  onApply,
  onClose,
  simulation,
}: MatchClockConfigDrawerProps) {
  const t = useT();
  const [speechTestStatus, setSpeechTestStatus] = useState<string | null>(null);

  return (
    <div
      className="max-w-3xl mx-auto mt-4 mx-4 p-4 rounded-xl border bg-white dark:bg-[#121414] border-[#ffd700]/30 shadow-lg"
      id="simulation-panel"
    >
      <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-100 dark:border-white/5">
        <h3 className="font-anton text-sm tracking-wider uppercase text-[#ffd700] flex items-center gap-1.5">
          <Edit3 size={15} /> {t("aoVivo.config.title")}
        </h3>
        <button
          id="btn-close-config"
          onClick={onClose}
          className="text-xs text-red-500 font-mono"
        >
          {t("aoVivo.config.close")}
        </button>
      </div>

      {/* Speech (Narração) status — diagnostic readout */}
      <div
        id="speech-status-info"
        data-testid="speech-status-info"
        className="mb-4 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 p-3"
      >
        <p className="font-mono text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
          {t("aoVivo.config.narrationStatus")}
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px]">
          <dt className="text-slate-400">{t("aoVivo.config.browserSupport")}</dt>
          <dd className={matchSpeech.status.supported ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
            {matchSpeech.status.supported ? t("aoVivo.config.available") : t("aoVivo.config.unavailable")}
          </dd>
          <dt className="text-slate-400">{t("aoVivo.config.voiceEngine")}</dt>
          <dd className={matchSpeech.status.engineLoaded ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}>
            {matchSpeech.status.engineLoaded ? t("aoVivo.config.loaded") : matchSpeech.status.supported ? t("aoVivo.config.loading") : t("aoVivo.config.dash")}
          </dd>
          <dt className="text-slate-400">{t("aoVivo.config.selectedVoice")}</dt>
          <dd className="text-slate-700 dark:text-slate-200 truncate">
            {matchSpeech.status.voiceName ?? (matchSpeech.status.engineLoaded ? t("aoVivo.config.loadingVoice") : t("aoVivo.config.dash"))}
            {matchSpeech.status.voiceLocal !== null && (
              <span className="text-slate-400">
                {matchSpeech.status.voiceLocal ? t("aoVivo.config.voiceOnDevice") : t("aoVivo.config.voiceOnNetwork")}
              </span>
            )}
          </dd>
          <dt className="text-slate-400">{t("aoVivo.config.narration")}</dt>
          <dd className={matchSpeech.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}>
            {matchSpeech.enabled ? t("aoVivo.config.enabled") : t("aoVivo.config.disabled")}
          </dd>
        </dl>

        {matchSpeech.supported && (
          <>
            {matchSpeech.voices.length > 0 && (
              <div className="mt-3">
                <label
                  htmlFor="select-narration-voice"
                  className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 mb-1"
                >
                  {t("aoVivo.config.voiceLabel")}
                </label>
                <select
                  id="select-narration-voice"
                  data-testid="select-narration-voice"
                  value={matchSpeech.selectedVoiceUri ?? ""}
                  onChange={(e) => matchSpeech.selectVoice(e.target.value)}
                  className="w-full rounded-lg border px-2 py-2 font-mono text-xs border-slate-300 bg-white text-slate-800 dark:border-white/15 dark:bg-black dark:text-white"
                >
                  <option value="">{t("aoVivo.config.voiceAuto")}</option>
                  {matchSpeech.voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang}){v.localService ? "" : t("aoVivo.config.voiceNetworkSuffix")}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              id="btn-test-narration"
              data-testid="btn-test-narration"
              onClick={() => {
                setSpeechTestStatus(t("aoVivo.config.testVoiceStarting"));
                // Pass a voice only when the user explicitly picked one;
                // "Automática" → simplest call (device default voice).
                runDirectSpeechTest(
                  setSpeechTestStatus,
                  matchSpeech.selectedVoiceUri ? matchSpeech.selectedVoice : null,
                );
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider transition border-[#009c3b]/40 bg-[#009c3b]/10 text-[#007a2f] hover:bg-[#009c3b]/20 dark:border-[#00e476]/30 dark:bg-[#00e476]/10 dark:text-[#00e476] dark:hover:bg-[#00e476]/20"
              title={t("aoVivo.config.testVoiceTitle")}
            >
              <Mic size={14} aria-hidden="true" />
              {t("aoVivo.config.testVoice")}
            </button>
            {speechTestStatus && (
              <p
                data-testid="speech-test-result"
                className="mt-2 font-mono text-[11px] text-slate-600 dark:text-slate-300"
              >
                {speechTestStatus}
              </p>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-mono mb-1 text-slate-600 dark:text-slate-300">
            {t("aoVivo.config.kickoffLabel")}
          </label>
          <input
            id="input-kickoff-time"
            type="text"
            value={customKickoffTime}
            onChange={(e) => onKickoffTimeChange(e.target.value)}
            className="w-full text-sm font-mono p-2 border rounded bg-slate-50 dark:bg-black text-slate-900 dark:text-white"
            placeholder={t("aoVivo.config.kickoffPlaceholder")}
          />
        </div>
        <div>
          <label className="block text-sm font-mono mb-1 text-slate-600 dark:text-slate-300">
            {t("aoVivo.config.remainingLabel")}
          </label>
          <input
            id="input-countdown-seconds"
            type="number"
            value={customCountdownSeconds}
            onChange={(e) =>
              onCountdownSecondsChange(parseInt(e.target.value) || 0)
            }
            className="w-full text-sm font-mono p-2 border rounded bg-slate-50 dark:bg-black text-slate-900 dark:text-white"
          />
          <span className="text-xs text-slate-600 dark:text-slate-300 italic">
            {t("aoVivo.config.convertedPreview", {
              value: formatCountdown(customCountdownSeconds),
            })}
          </span>
        </div>
      </div>
      <div
        className="mt-4 rounded-xl border border-slate-100 dark:border-white/5 p-4"
        id="simulation-controls-panel"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-anton text-sm tracking-wider uppercase text-slate-800 dark:text-white">
              {t("aoVivo.config.simulatorTitle")}
            </p>
            <p className="text-xs font-archivo text-slate-600 dark:text-slate-300 leading-5">
              {t("aoVivo.config.simulatorDesc")}
            </p>
          </div>
          <button
            id="btn-reset-simulation"
            type="button"
            onClick={simulation.onReset}
            className="px-3 py-2 border rounded font-mono text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            {t("aoVivo.config.resetDemo")}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          <button
            id="btn-sim-start-live"
            type="button"
            onClick={simulation.onStartLive}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#004d2c] px-3 py-2 font-anton text-xs uppercase tracking-wider text-white hover:bg-[#00391f]"
          >
            <CircleDot size={14} />
            {t("aoVivo.config.startLive")}
          </button>
          <button
            id="btn-sim-goal-a"
            type="button"
            onClick={() => simulation.onGoal("A")}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-anton text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#161919] dark:text-white dark:hover:bg-white/10"
          >
            <Goal size={14} />
            {t("aoVivo.config.goal", { code: homeCode })}
          </button>
          <button
            id="btn-sim-goal-b"
            type="button"
            onClick={() => simulation.onGoal("B")}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-anton text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#161919] dark:text-white dark:hover:bg-white/10"
          >
            <Goal size={14} />
            {t("aoVivo.config.goal", { code: awayCode })}
          </button>
          <button
            id="btn-sim-yellow-a"
            type="button"
            onClick={() => simulation.onCard("YELLOW_CARD", "A")}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-anton text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#161919] dark:text-white dark:hover:bg-white/10"
          >
            <ShieldAlert size={14} />
            {t("aoVivo.config.yellow", { code: homeCode })}
          </button>
          <button
            id="btn-sim-red-b"
            type="button"
            onClick={() => simulation.onCard("RED_CARD", "B")}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-anton text-xs uppercase tracking-wider text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-[#161919] dark:text-white dark:hover:bg-white/10"
          >
            <ShieldAlert size={14} />
            {t("aoVivo.config.red", { code: awayCode })}
          </button>
          <button
            id="btn-sim-finish-match"
            type="button"
            onClick={simulation.onFinish}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1f2937] px-3 py-2 font-anton text-xs uppercase tracking-wider text-white hover:bg-[#111827]"
          >
            {t("aoVivo.config.finishMatch")}
          </button>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          id="btn-apply-match-config"
          onClick={onApply}
          className="px-4 py-2 bg-[#004d2c] text-white rounded font-anton uppercase text-xs hover:bg-[#00391f]"
        >
          {t("aoVivo.config.applyToMatch")}
        </button>
      </div>
    </div>
  );
}
