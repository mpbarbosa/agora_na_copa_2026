import { useEffect, useMemo, useState } from "react";
import type { PredictionResponse, TriviaQuestion } from "../types";
import { standings as TOURNAMENT_TEAMS } from "../data/tournament";
import { parseNoteSections } from "../utils/noteSections";
import { DonationPix } from "./DonationPix";

interface FanZoneViewProps {
  theme: "classic-light" | "stadium-dark";
}

type ShotDirection = "esquerda" | "centro" | "direita";

interface PenaltyStats {
  rounds: number;
  goals: number;
  saves: number;
}

const KEEPER_SEQUENCE: ShotDirection[] = ["centro", "direita", "esquerda", "centro"];

const PENALTY_OPTIONS: { id: ShotDirection; label: string }[] = [
  { id: "esquerda", label: "Canto esquerdo" },
  { id: "centro", label: "No meio" },
  { id: "direita", label: "Canto direito" },
];

function nextKeeperDive(round: number): ShotDirection {
  return KEEPER_SEQUENCE[round % KEEPER_SEQUENCE.length];
}

// The 48 seeded teams, by name, for the match-predictor selectors.
const PREDICTOR_TEAMS = [...TOURNAMENT_TEAMS]
  .map((row) => ({ code: row.code, name: row.name }))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

export function FanZoneView({ theme }: FanZoneViewProps) {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [quizStatus, setQuizStatus] = useState<"loading" | "ready" | "error">("loading");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [penaltyStats, setPenaltyStats] = useState<PenaltyStats>({
    rounds: 0,
    goals: 0,
    saves: 0,
  });
  const [lastPenaltyResult, setLastPenaltyResult] = useState<{
    shot: ShotDirection;
    keeper: ShotDirection;
    goal: boolean;
  } | null>(null);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [predictorNotes, setPredictorNotes] = useState("");
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [predictorStatus, setPredictorStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    let active = true;

    const loadQuestions = async () => {
      try {
        const response = await fetch("/api/questions");
        if (!response.ok) {
          throw new Error("Falha ao carregar quiz da torcida.");
        }

        const data: TriviaQuestion[] = await response.json();
        if (!active) {
          return;
        }

        setQuestions(data);
        setQuizStatus("ready");
      } catch (error) {
        console.error(error);
        if (!active) {
          return;
        }

        setQuizStatus("error");
      }
    };

    void loadQuestions();

    return () => {
      active = false;
    };
  }, []);

  const currentQuestion = questions[questionIndex];
  const answered = selectedOptionIndex !== null;
  const isCorrect =
    answered && currentQuestion
      ? selectedOptionIndex === currentQuestion.correctOptionIndex
      : false;

  const quizProgressLabel = useMemo(() => {
    if (questions.length === 0) {
      return "Aquecendo o quiz";
    }

    return `Pergunta ${questionIndex + 1} de ${questions.length}`;
  }, [questionIndex, questions.length]);

  const shellClasses =
    theme === "classic-light"
      ? "bg-white border-slate-200 shadow-sm"
      : "bg-[#121414] border-white/10";
  const cardClasses =
    theme === "classic-light"
      ? "bg-slate-50 border-slate-200"
      : "bg-white/5 border-white/10";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const subtleClasses = theme === "classic-light" ? "text-slate-500" : "text-slate-400";
  const idleButtonClasses =
    theme === "classic-light"
      ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      : "border-white/10 bg-[#161919] text-slate-100 hover:border-white/20";

  const handleSelectOption = (optionIndex: number) => {
    if (!currentQuestion || answered) {
      return;
    }

    setSelectedOptionIndex(optionIndex);
    if (optionIndex === currentQuestion.correctOptionIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (questionIndex === questions.length - 1) {
      setQuestionIndex(0);
      setSelectedOptionIndex(null);
      setScore(0);
      return;
    }

    setQuestionIndex((prev) => prev + 1);
    setSelectedOptionIndex(null);
  };

  const handlePenaltyShot = (shot: ShotDirection) => {
    const keeper = nextKeeperDive(penaltyStats.rounds);
    const goal = keeper !== shot;

    setLastPenaltyResult({ shot, keeper, goal });
    setPenaltyStats((prev) => ({
      rounds: prev.rounds + 1,
      goals: prev.goals + (goal ? 1 : 0),
      saves: prev.saves + (goal ? 0 : 1),
    }));
  };

  const resetPenaltyGame = () => {
    setPenaltyStats({ rounds: 0, goals: 0, saves: 0 });
    setLastPenaltyResult(null);
  };

  const sameTeams = homeTeam !== "" && homeTeam === awayTeam;
  const canPredict = homeTeam !== "" && awayTeam !== "" && !sameTeams && predictorStatus !== "loading";

  const requestPrediction = async () => {
    if (!canPredict) return;
    setPredictorStatus("loading");
    setPrediction(null);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeTeam, awayTeam, userNotes: predictorNotes }),
      });
      if (!response.ok) throw new Error("predict request failed");
      const data: PredictionResponse = await response.json();
      setPrediction(data);
      setPredictorStatus("ready");
    } catch {
      setPredictorStatus("error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 mt-8" id="fanzone-view">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}
            id="fanzone-title"
          >
            Fan Zone
          </h2>
          <p className={`mt-1 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
            Quiz da torcida, disputa de pênaltis e palpite simulado das partidas
          </p>
        </div>

        <span
          className={`inline-flex rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
            theme === "classic-light"
              ? "border-slate-200 bg-slate-50 text-slate-600"
              : "border-white/10 bg-white/5 text-slate-200"
          }`}
          id="fanzone-scope-note"
        >
          Palpite 100% simulado • sem IA externa
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className={`rounded-3xl border p-5 ${shellClasses}`} id="fanzone-trivia-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
                Quiz da torcida
              </p>
              <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                {quizProgressLabel}
              </p>
            </div>

            <div
              className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                theme === "classic-light"
                  ? "border-slate-200 bg-slate-50 text-slate-600"
                  : "border-white/10 bg-white/5 text-slate-200"
              }`}
              id="fanzone-trivia-score"
            >
              Placar: {score}
            </div>
          </div>

          {quizStatus === "loading" ? (
            <p className={`mt-6 font-archivo text-sm leading-6 ${mutedClasses}`}>
              Carregando perguntas do aquecimento da torcida...
            </p>
          ) : quizStatus === "error" ? (
            <p className={`mt-6 font-archivo text-sm leading-6 ${mutedClasses}`}>
              Não foi possível carregar o quiz agora. Tente atualizar a Fan Zone.
            </p>
          ) : currentQuestion ? (
            <div className="mt-6" id="fanzone-trivia-question">
              <div className={`rounded-2xl border p-4 ${cardClasses}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                      theme === "classic-light"
                        ? "border-slate-200 bg-white text-slate-600"
                        : "border-white/10 bg-[#161919] text-slate-200"
                    }`}
                  >
                    {currentQuestion.category}
                  </span>
                </div>

                <p className={`mt-4 font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
                  {currentQuestion.question}
                </p>

                <div className="mt-4 flex flex-col gap-3">
                  {currentQuestion.options.map((option, optionIndex) => {
                    const isSelected = selectedOptionIndex === optionIndex;
                    const shouldHighlightCorrect =
                      answered && optionIndex === currentQuestion.correctOptionIndex;

                    const optionClasses = !answered
                      ? idleButtonClasses
                      : shouldHighlightCorrect
                        ? theme === "classic-light"
                          ? "border-[#009c3b] bg-[#009c3b]/10 text-[#065f2c]"
                          : "border-[#00e476] bg-[#00e476]/10 text-[#a7e6bf]"
                        : isSelected
                          ? theme === "classic-light"
                            ? "border-[#c1121f]/25 bg-[#ed2939]/10 text-[#9f1239]"
                            : "border-[#ed2939]/20 bg-[#ed2939]/10 text-[#ff9cab]"
                          : idleButtonClasses;

                    return (
                      <button
                        key={option}
                        id={`btn-trivia-option-${optionIndex}`}
                        type="button"
                        onClick={() => handleSelectOption(optionIndex)}
                        disabled={answered}
                        className={`min-h-11 rounded-2xl border px-4 py-3 text-left font-archivo text-sm leading-6 transition ${optionClasses}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {answered ? (
                  <div className="mt-5" id="fanzone-trivia-feedback">
                    <p
                      className={`font-mono text-[11px] uppercase tracking-wider ${
                        isCorrect
                          ? theme === "classic-light"
                            ? "text-[#065f2c]"
                            : "text-[#a7e6bf]"
                          : theme === "classic-light"
                            ? "text-[#9f1239]"
                            : "text-[#ff9cab]"
                      }`}
                    >
                      {isCorrect ? "Resposta certa" : "Não foi dessa vez"}
                    </p>
                    <p className={`mt-2 font-archivo text-sm leading-6 ${mutedClasses}`}>
                      {currentQuestion.explanation}
                    </p>
                    <button
                      id="btn-trivia-next"
                      type="button"
                      onClick={handleNextQuestion}
                      className={`mt-4 min-h-11 rounded-full border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition ${idleButtonClasses}`}
                    >
                      {questionIndex === questions.length - 1
                        ? "Reiniciar quiz"
                        : "Próxima pergunta"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        <section className={`rounded-3xl border p-5 ${shellClasses}`} id="fanzone-penalty-panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
                Disputa de pênaltis
              </p>
              <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                Escolha o canto e veja para onde o goleiro mergulha
              </p>
            </div>

            <button
              id="btn-penalty-reset"
              type="button"
              onClick={resetPenaltyGame}
              className={`min-h-11 rounded-full border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition ${idleButtonClasses}`}
            >
              Reiniciar disputa
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3" id="penalty-scoreboard">
            <div className={`rounded-2xl border px-4 py-3 ${cardClasses}`}>
              <p className={`font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
                Batidas
              </p>
              <p className={`mt-2 font-anton text-2xl uppercase tracking-wide ${headingClasses}`}>
                {penaltyStats.rounds}
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 ${cardClasses}`}>
              <p className={`font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
                Gols
              </p>
              <p className={`mt-2 font-anton text-2xl uppercase tracking-wide ${headingClasses}`}>
                {penaltyStats.goals}
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 ${cardClasses}`}>
              <p className={`font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
                Defesas
              </p>
              <p className={`mt-2 font-anton text-2xl uppercase tracking-wide ${headingClasses}`}>
                {penaltyStats.saves}
              </p>
            </div>
          </div>

          <div className={`mt-5 rounded-2xl border p-4 ${cardClasses}`}>
            <p className={`font-archivo text-sm leading-6 ${mutedClasses}`}>
              O goleiro alterna leitura de cantos em um padrão pseudoaleatório para
              manter a brincadeira rápida e consistente entre as rodadas.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PENALTY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  id={`btn-penalty-${option.id}`}
                  type="button"
                  onClick={() => handlePenaltyShot(option.id)}
                  className={`min-h-11 rounded-2xl border px-4 py-3 text-left font-mono text-[11px] font-bold uppercase tracking-wider transition ${idleButtonClasses}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`mt-5 rounded-2xl border p-4 ${cardClasses}`} id="penalty-result-panel">
            <p className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
              Resultado da última cobrança
            </p>

            {lastPenaltyResult ? (
              <div className="mt-4">
                <p
                  className={`font-mono text-[11px] uppercase tracking-wider ${
                    lastPenaltyResult.goal
                      ? theme === "classic-light"
                        ? "text-[#065f2c]"
                        : "text-[#a7e6bf]"
                      : theme === "classic-light"
                        ? "text-[#9f1239]"
                        : "text-[#ff9cab]"
                  }`}
                  id="penalty-result-status"
                >
                  {lastPenaltyResult.goal ? "Gol confirmado" : "Goleiro defendeu"}
                </p>
                <p className={`mt-2 font-archivo text-sm leading-6 ${mutedClasses}`}>
                  Você bateu em{" "}
                  <span className={headingClasses}>{lastPenaltyResult.shot}</span> e o
                  goleiro caiu em{" "}
                  <span className={headingClasses}>{lastPenaltyResult.keeper}</span>.
                </p>
              </div>
            ) : (
              <p className={`mt-4 font-archivo text-sm leading-6 ${mutedClasses}`}>
                Faça a primeira cobrança para abrir o placar da Fan Zone.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className={`mt-5 rounded-3xl border p-5 ${shellClasses}`} id="fanzone-predictor-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className={`font-anton text-xl uppercase tracking-wide ${headingClasses}`}>
              Palpite da partida
            </h3>
            <p className={`mt-1 font-archivo text-sm ${mutedClasses}`}>
              Escolha duas seleções e gere um prognóstico a partir da campanha atual delas.
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
              theme === "classic-light"
                ? "border-amber-400/60 bg-amber-50 text-amber-700"
                : "border-[#ffd84d]/40 bg-[#ffd84d]/5 text-[#ffd84d]/80"
            }`}
            id="fanzone-predictor-mode"
          >
            Simulado
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([
            { id: "home", label: "Mandante", value: homeTeam, set: setHomeTeam },
            { id: "away", label: "Visitante", value: awayTeam, set: setAwayTeam },
          ] as const).map((field) => (
            <label
              key={field.id}
              className={`flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider ${subtleClasses}`}
            >
              {field.label}
              <select
                id={`select-predictor-${field.id}`}
                value={field.value}
                onChange={(event) => field.set(event.target.value)}
                className={`min-h-11 rounded-xl border px-3 py-2 font-archivo text-sm normal-case tracking-normal ${
                  theme === "classic-light"
                    ? "border-slate-200 bg-white text-slate-800"
                    : "border-white/10 bg-[#161919] text-slate-100"
                }`}
              >
                <option value="">Selecione…</option>
                {PREDICTOR_TEAMS.map((team) => (
                  <option key={team.code} value={team.code}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <textarea
          id="input-predictor-notes"
          value={predictorNotes}
          onChange={(event) => setPredictorNotes(event.target.value)}
          maxLength={280}
          rows={2}
          placeholder="Opcional: seu pitaco (lesões, clima, fator casa…)"
          className={`mt-3 w-full rounded-xl border px-3 py-2 font-archivo text-sm ${
            theme === "classic-light"
              ? "border-slate-200 bg-white text-slate-800"
              : "border-white/10 bg-[#161919] text-slate-100"
          }`}
        />

        {sameTeams && (
          <p className={`mt-2 font-archivo text-xs ${subtleClasses}`}>Escolha duas seleções diferentes.</p>
        )}

        <button
          id="btn-predictor-run"
          type="button"
          onClick={requestPrediction}
          disabled={!canPredict}
          className={`mt-4 inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50 ${idleButtonClasses}`}
        >
          {predictorStatus === "loading" ? "Gerando…" : "Gerar palpite"}
        </button>

        {predictorStatus === "ready" && prediction && (
          <div id="fanzone-predictor-result" className={`mt-5 rounded-2xl border p-4 ${cardClasses}`}>
            {prediction.simulated && (
              <span
                id="fanzone-predictor-simulado-badge"
                className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                  theme === "classic-light"
                    ? "border-amber-400/60 text-amber-700"
                    : "border-[#ffd84d]/40 text-[#ffd84d]/80"
                }`}
              >
                Palpite simulado
              </span>
            )}
            {parseNoteSections(prediction.text, "Prognóstico").map((section) => (
              <div key={section.label} className="mt-3">
                <p className={`font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>{section.label}</p>
                <p className={`mt-1 font-archivo text-sm leading-6 ${mutedClasses}`}>{section.body}</p>
              </div>
            ))}
          </div>
        )}
        {predictorStatus === "error" && (
          <p id="fanzone-predictor-error" className={`mt-4 font-archivo text-sm ${mutedClasses}`}>
            Não foi possível gerar o palpite agora. Tente novamente.
          </p>
        )}
      </section>

      <div className="mt-5">
        <DonationPix theme={theme} variant="full" />
      </div>
    </div>
  );
}
