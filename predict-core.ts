// Pure logic for the Fan Zone match predictor ("Prognóstico simulado"). This build
// has NO AI dependency: the forecast is a deterministic heuristic computed only from
// each team's REAL current tournament form (points, goal difference, goals), so it is
// reproducible and unit-testable. Extracted from server.ts so it can be tested
// independently (tests/predict-core.test.ts) — mirrors weather-core.ts / trends-core.ts.
// The endpoint that resolves teams and serves this lives in server.ts; this module
// only turns two teams' stats into a pt-BR markdown prognosis. The "simulado" framing
// is deliberate: it never claims to be a real forecast or invents a result as fact.

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

// Deterministic "form strength" from current campaign numbers only. Higher is better.
// Weights points heaviest, then goal difference, then attacking output — all real.
function strength(team: PredictionTeam): number {
  return team.points * 3 + team.goalDifference * 2 + team.goalsFor;
}

// Goals-per-game rounded to a whole number, 0 when the team has not played yet.
function goalsPerGame(team: PredictionTeam): number {
  return team.played > 0 ? Math.round(team.goalsFor / team.played) : 0;
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

/**
 * Build a pt-BR markdown prognosis (`## Section` blocks, parseable by
 * `src/utils/noteSections.ts`) for `home` vs `away`. Deterministic: same inputs →
 * same text. `userNotes`, when present, is acknowledged but never treated as fact.
 */
export function buildPrediction(
  home: PredictionTeam,
  away: PredictionTeam,
  userNotes?: string,
): string {
  const margin = strength(home) - strength(away);
  const bothPlayed = home.played > 0 && away.played > 0;

  let verdict: string;
  if (!bothPlayed) {
    verdict =
      `Cedo demais para cravar: ${home.name} e ${away.name} mal aqueceram os motores. ` +
      `Por enquanto, confronto totalmente em aberto.`;
  } else if (Math.abs(margin) <= 2) {
    verdict = `Jogo de igual para igual entre ${home.name} e ${away.name} — moeda no ar.`;
  } else {
    const fav = margin > 0 ? home : away;
    const dog = margin > 0 ? away : home;
    const strong = Math.abs(margin) > 6;
    verdict = strong
      ? `${fav.name} entra como favorito claro diante de ${dog.name}, pela campanha mais sólida.`
      : `${fav.name} leva leve vantagem sobre ${dog.name}, mas sem folga para vacilar.`;
  }

  // Simulated scoreline only when there is real form to project from.
  let scoreline = "";
  if (bothPlayed) {
    let hg = goalsPerGame(home);
    let ag = goalsPerGame(away);
    if (hg === ag && margin !== 0) {
      if (margin > 0) hg += 1;
      else ag += 1;
    }
    scoreline = `\nPlacar simulado: ${home.name} ${hg} x ${ag} ${away.name}.`;
  }

  const notes = userNotes?.trim().slice(0, 280);
  const notesLine = notes ? `\nVocê destacou: "${notes}" — anotado, mas o palpite segue a campanha.` : "";

  return [
    `## Prognóstico`,
    `${verdict}${scoreline}`,
    `## Números`,
    `${teamLine(home)}\n${teamLine(away)}`,
    `## Leitura`,
    `Palpite simulado, gerado só a partir da campanha atual das seleções — ` +
      `é diversão para a torcida, não cravada de resultado.${notesLine}`,
  ].join("\n");
}
