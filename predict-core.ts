// Pure logic for the Fan Zone / bracket match predictor ("Prognóstico simulado"). This
// build has NO AI dependency: the forecast is the Dixon–Coles bivariate Poisson model
// from qualification-sim-core (predictMatchOutcome) — win/draw/loss probabilities and a
// modal scoreline — narrated here in pt-BR. The model and this narrator are both
// deterministic, so the prognosis is reproducible and unit-testable
// (tests/predict-core.test.ts) — mirrors weather-core.ts / trends-core.ts. The endpoint
// that resolves teams, runs the model and serves this lives in server.ts; this module
// only turns two teams' stats + their model outcome into a pt-BR markdown prognosis. The
// "simulado" framing is deliberate: it never claims to be a real forecast or invents a
// result as fact.

import type { MatchOutcome } from "./src/types";

/** The subset of a team's standings row the predictor reasons over. */
export interface PredictionTeam {
  name: string;
  code: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

function teamLine(team: PredictionTeam): string {
  if (team.played === 0) {
    return `${team.name} ainda não entrou em campo nesta Copa.`;
  }
  const sign = team.goalDifference > 0 ? `+${team.goalDifference}` : `${team.goalDifference}`;
  return (
    `${team.name} — ${team.points} pts em ${team.played} ` +
    `jogo${team.played === 1 ? "" : "s"} (${team.won}V ${team.drawn}E ${team.lost}D), ` +
    `${team.goalsFor} gols pró, ${team.goalsAgainst} contra, saldo ${sign}.`
  );
}

function pct(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

/**
 * Build a pt-BR markdown prognosis (`## Section` blocks, parseable by
 * `src/utils/noteSections.ts`) for `home` vs `away`, narrating the Dixon–Coles model
 * `outcome` (from `predictMatchOutcome`). Deterministic: same inputs → same text.
 * `userNotes`, when present, is acknowledged but never treated as fact.
 */
export function buildPrediction(
  home: PredictionTeam,
  away: PredictionTeam,
  outcome: MatchOutcome,
  userNotes?: string,
): string {
  const bothPlayed = home.played > 0 && away.played > 0;
  // The model's win-probability edge decides the verdict tone.
  const edge = outcome.homeWin - outcome.awayWin;

  let verdict: string;
  if (!bothPlayed) {
    verdict =
      `Cedo demais para cravar: ${home.name} e ${away.name} mal aqueceram os motores. ` +
      `Por enquanto, confronto totalmente em aberto.`;
  } else if (Math.abs(edge) <= 0.1) {
    verdict = `Jogo de igual para igual entre ${home.name} e ${away.name} — moeda no ar.`;
  } else {
    const fav = edge > 0 ? home : away;
    const dog = edge > 0 ? away : home;
    const strong = Math.abs(edge) > 0.3;
    verdict = strong
      ? `${fav.name} entra como favorito claro diante de ${dog.name}, pela campanha mais sólida.`
      : `${fav.name} leva leve vantagem sobre ${dog.name}, mas sem folga para vacilar.`;
  }

  // Model numbers only when there is real form to project from.
  let modelLines = "";
  if (bothPlayed) {
    const probLine =
      `Probabilidades: ${home.name} ${pct(outcome.homeWin)} · ` +
      `empate ${pct(outcome.draw)} · ${away.name} ${pct(outcome.awayWin)}.`;
    const { teamA, teamB } = outcome.mostLikelyScore;
    const scoreLine = `Placar mais provável: ${home.name} ${teamA} x ${teamB} ${away.name}.`;
    modelLines = `\n${probLine}\n${scoreLine}`;
  }

  const notes = userNotes?.trim().slice(0, 280);
  const notesLine = notes ? `\nVocê destacou: "${notes}" — anotado, mas o palpite segue a campanha.` : "";

  return [
    `## Prognóstico`,
    `${verdict}${modelLines}`,
    `## Números`,
    `${teamLine(home)}\n${teamLine(away)}`,
    `## Leitura`,
    `Palpite simulado por um modelo de Poisson com correção Dixon-Coles sobre a campanha ` +
      `atual das seleções — é diversão para a torcida, não cravada de resultado.${notesLine}`,
  ].join("\n");
}
