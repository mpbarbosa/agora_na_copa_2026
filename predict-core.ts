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
import type { Locale } from "./src/i18n/locale";

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

function teamLine(team: PredictionTeam, locale: Locale = "pt"): string {
  if (team.played === 0) {
    if (locale === "es") return `${team.name} aún no ha entrado en cancha en este Mundial.`;
    if (locale === "en") return `${team.name} haven't taken the field yet at this World Cup.`;
    return `${team.name} ainda não entrou em campo nesta Copa.`;
  }
  const sign = team.goalDifference > 0 ? `+${team.goalDifference}` : `${team.goalDifference}`;
  if (locale === "es") {
    return (
      `${team.name} — ${team.points} pts en ${team.played} ` +
      `partido${team.played === 1 ? "" : "s"} (${team.won}G ${team.drawn}E ${team.lost}P), ` +
      `${team.goalsFor} goles a favor, ${team.goalsAgainst} en contra, diferencia ${sign}.`
    );
  }
  if (locale === "en") {
    return (
      `${team.name} — ${team.points} pts in ${team.played} ` +
      `match${team.played === 1 ? "" : "es"} (${team.won}W ${team.drawn}D ${team.lost}L), ` +
      `${team.goalsFor} goals for, ${team.goalsAgainst} against, GD ${sign}.`
    );
  }
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
  locale: Locale = "pt",
): string {
  const es = locale === "es";
  const en = locale === "en";
  const bothPlayed = home.played > 0 && away.played > 0;
  // The model's win-probability edge decides the verdict tone.
  const edge = outcome.homeWin - outcome.awayWin;

  let verdict: string;
  if (!bothPlayed) {
    verdict = es
      ? `Demasiado pronto para definir: ${home.name} y ${away.name} apenas calentaron motores. ` +
        `Por ahora, un duelo totalmente abierto.`
      : en
      ? `Too early to call: ${home.name} and ${away.name} have barely warmed up. ` +
        `For now, a wide-open matchup.`
      : `Cedo demais para cravar: ${home.name} e ${away.name} mal aqueceram os motores. ` +
        `Por enquanto, confronto totalmente em aberto.`;
  } else if (Math.abs(edge) <= 0.1) {
    verdict = es
      ? `Partido parejo entre ${home.name} y ${away.name} — moneda al aire.`
      : en
      ? `An even matchup between ${home.name} and ${away.name} — a coin flip.`
      : `Jogo de igual para igual entre ${home.name} e ${away.name} — moeda no ar.`;
  } else {
    const fav = edge > 0 ? home : away;
    const dog = edge > 0 ? away : home;
    const strong = Math.abs(edge) > 0.3;
    if (es) {
      verdict = strong
        ? `${fav.name} llega como favorito claro ante ${dog.name}, por la campaña más sólida.`
        : `${fav.name} tiene una leve ventaja sobre ${dog.name}, pero sin margen para relajarse.`;
    } else if (en) {
      verdict = strong
        ? `${fav.name} come in as clear favorites over ${dog.name}, on the stronger campaign.`
        : `${fav.name} hold a slight edge over ${dog.name}, but no room to relax.`;
    } else {
      verdict = strong
        ? `${fav.name} entra como favorito claro diante de ${dog.name}, pela campanha mais sólida.`
        : `${fav.name} leva leve vantagem sobre ${dog.name}, mas sem folga para vacilar.`;
    }
  }

  // Model numbers only when there is real form to project from.
  let modelLines = "";
  if (bothPlayed) {
    // "Probabilidades" / "empate" read identically in pt and es.
    const probLine = en
      ? `Probabilities: ${home.name} ${pct(outcome.homeWin)} · ` +
        `draw ${pct(outcome.draw)} · ${away.name} ${pct(outcome.awayWin)}.`
      : `Probabilidades: ${home.name} ${pct(outcome.homeWin)} · ` +
        `empate ${pct(outcome.draw)} · ${away.name} ${pct(outcome.awayWin)}.`;
    const { teamA, teamB } = outcome.mostLikelyScore;
    const scoreLine = es
      ? `Marcador más probable: ${home.name} ${teamA} x ${teamB} ${away.name}.`
      : en
      ? `Most likely score: ${home.name} ${teamA}-${teamB} ${away.name}.`
      : `Placar mais provável: ${home.name} ${teamA} x ${teamB} ${away.name}.`;
    modelLines = `\n${probLine}\n${scoreLine}`;
  }

  const notes = userNotes?.trim().slice(0, 280);
  const notesLine = notes
    ? es
      ? `\nDestacaste: "${notes}" — anotado, pero el pronóstico sigue la campaña.`
      : en
      ? `\nYou noted: "${notes}" — noted, but the prediction follows the campaign.`
      : `\nVocê destacou: "${notes}" — anotado, mas o palpite segue a campanha.`
    : "";

  if (en) {
    return [
      `## Prediction`,
      `${verdict}${modelLines}`,
      `## Numbers`,
      `${teamLine(home, locale)}\n${teamLine(away, locale)}`,
      `## Read`,
      `Simulated prediction from a Poisson model with Dixon-Coles correction over the teams' ` +
        `current campaign — it's fun for fans, not a called result.${notesLine}`,
    ].join("\n");
  }

  if (es) {
    return [
      `## Pronóstico`,
      `${verdict}${modelLines}`,
      `## Números`,
      `${teamLine(home, locale)}\n${teamLine(away, locale)}`,
      `## Lectura`,
      `Pronóstico simulado con un modelo de Poisson con corrección Dixon-Coles sobre la campaña ` +
        `actual de las selecciones — es diversión para la hinchada, no un resultado cantado.${notesLine}`,
    ].join("\n");
  }

  return [
    `## Prognóstico`,
    `${verdict}${modelLines}`,
    `## Números`,
    `${teamLine(home, locale)}\n${teamLine(away, locale)}`,
    `## Leitura`,
    `Palpite simulado por um modelo de Poisson com correção Dixon-Coles sobre a campanha ` +
      `atual das seleções — é diversão para a torcida, não cravada de resultado.${notesLine}`,
  ].join("\n");
}
