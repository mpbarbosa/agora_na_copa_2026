import { useEffect, useState } from "react";
import type { PredictionResponse } from "../types";
import { parseNoteSections } from "../utils/noteSections";
import { FlagIcon } from "./FlagIcon";
import { useT } from "../i18n";

/** A knockout slot resolved to a team — the subset the predictor needs. */
export interface ResolvedSlotTeam {
  code: string;
  name: string;
  flagSvg: string;
}

/** A knockout fixture whose BOTH sides are already resolved, so it can be forecast. */
export interface PredictableFixture {
  matchNumber: number;
  stageLabel: string;
  kickoff: string;
  home: ResolvedSlotTeam;
  away: ResolvedSlotTeam;
}

interface BracketPredictorPanelProps {
  theme: "classic-light" | "stadium-dark";
  fixtures: PredictableFixture[];
}

type Status = "idle" | "loading" | "ready" | "error";

// Predicts a defined knockout tie via /api/predict — the same deterministic
// Dixon–Coles Poisson "palpite simulado" the Fan Zone uses, but driven by the
// bracket's own already-resolved fixtures (confirmed or provisional) rather than
// a free two-team choice. Only fixtures with both sides resolved are offered.
export function BracketPredictorPanel({ theme, fixtures }: BracketPredictorPanelProps) {
  const t = useT();
  const isLight = theme === "classic-light";
  const [selected, setSelected] = useState<number | null>(fixtures[0]?.matchNumber ?? null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  // Keep the selection valid as the resolvable fixtures shift with live standings.
  useEffect(() => {
    if (fixtures.length === 0) {
      setSelected(null);
      return;
    }
    setSelected((prev) =>
      prev !== null && fixtures.some((f) => f.matchNumber === prev) ? prev : fixtures[0].matchNumber,
    );
  }, [fixtures]);

  const fixture = fixtures.find((f) => f.matchNumber === selected) ?? null;

  // Auto-forecast whenever the chosen fixture changes — picking a tie is the action.
  useEffect(() => {
    if (!fixture) {
      setPrediction(null);
      setStatus("idle");
      return;
    }
    let active = true;
    setStatus("loading");
    setPrediction(null);
    void (async () => {
      try {
        const response = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ homeTeam: fixture.home.code, awayTeam: fixture.away.code }),
        });
        if (!response.ok) throw new Error("predict request failed");
        const data: PredictionResponse = await response.json();
        if (!active) return;
        setPrediction(data);
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [fixture?.home.code, fixture?.away.code, fixture]);

  const shellClasses = isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#121414] border-white/10";
  const cardClasses = isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10";
  const headingClasses = isLight ? "text-slate-900" : "text-white";
  const mutedClasses = isLight ? "text-slate-600" : "text-slate-300";
  const subtleClasses = isLight ? "text-slate-500" : "text-slate-400";

  return (
    <section className={`mt-6 rounded-3xl border p-4 md:p-5 ${shellClasses}`} id="bracket-predictor-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={`font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
            {t("bracket.predictor.title")}
          </h3>
          <p className={`mt-1 font-archivo text-sm ${mutedClasses}`}>
            {t("bracket.predictor.subtitle")}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
            isLight
              ? "border-amber-400/60 bg-amber-50 text-amber-700"
              : "border-[#ffd84d]/40 bg-[#ffd84d]/5 text-[#ffd84d]/80"
          }`}
          id="bracket-predictor-mode"
        >
          {t("bracket.predictor.simulated")}
        </span>
      </div>

      {fixtures.length === 0 ? (
        <p className={`mt-5 font-archivo text-sm leading-6 ${mutedClasses}`} id="bracket-predictor-empty">
          {t("bracket.predictor.empty")}
        </p>
      ) : (
        <>
          <label
            className={`mt-5 flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider ${subtleClasses}`}
          >
            {t("bracket.predictor.confrontoLabel")}
            <select
              id="select-bracket-predictor"
              value={selected ?? ""}
              onChange={(event) => setSelected(Number(event.target.value))}
              className={`min-h-11 rounded-xl border px-3 py-2 font-archivo text-sm normal-case tracking-normal ${
                isLight ? "border-slate-200 bg-white text-slate-800" : "border-white/10 bg-[#161919] text-slate-100"
              }`}
            >
              {fixtures.map((f) => (
                <option key={f.matchNumber} value={f.matchNumber}>
                  #{f.matchNumber} · {f.stageLabel} · {f.home.name} × {f.away.name}
                </option>
              ))}
            </select>
          </label>

          {fixture && (
            <div className={`mt-4 rounded-2xl border p-3 ${cardClasses}`} id="bracket-predictor-matchup">
              <div className="flex items-center justify-center gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <FlagIcon flag={fixture.home.flagSvg} className="h-4 w-6 shrink-0 rounded-[2px]" />
                  <span className={`truncate font-archivo text-sm ${headingClasses}`}>{fixture.home.name}</span>
                </span>
                <span className={`shrink-0 font-mono text-[11px] uppercase tracking-wider ${subtleClasses}`}>×</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`truncate font-archivo text-sm ${headingClasses}`}>{fixture.away.name}</span>
                  <FlagIcon flag={fixture.away.flagSvg} className="h-4 w-6 shrink-0 rounded-[2px]" />
                </span>
              </div>
              <p className={`mt-2 text-center font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
                {fixture.stageLabel} · {fixture.kickoff}
              </p>
            </div>
          )}

          {status === "loading" && (
            <p className={`mt-4 font-archivo text-sm leading-6 ${mutedClasses}`} id="bracket-predictor-loading">
              {t("bracket.predictor.loading")}
            </p>
          )}

          {status === "ready" && prediction && (
            <div id="bracket-predictor-result" className={`mt-4 rounded-2xl border p-4 ${cardClasses}`}>
              {prediction.simulated && (
                <span
                  id="bracket-predictor-simulado-badge"
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                    isLight ? "border-amber-400/60 text-amber-700" : "border-[#ffd84d]/40 text-[#ffd84d]/80"
                  }`}
                >
                  {t("bracket.predictor.simulatedBadge")}
                </span>
              )}
              {parseNoteSections(prediction.text, t("bracket.predictor.prognosisFallback")).map((section) => (
                <div key={section.label} className="mt-3">
                  <p className={`font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>{section.label}</p>
                  <p className={`mt-1 font-archivo text-sm leading-6 ${mutedClasses}`}>{section.body}</p>
                </div>
              ))}
            </div>
          )}

          {status === "error" && (
            <p id="bracket-predictor-error" className={`mt-4 font-archivo text-sm ${mutedClasses}`}>
              {t("bracket.predictor.error")}
            </p>
          )}
        </>
      )}
    </section>
  );
}
