// Standings catalog: the "Grupos" tab surfaces — the group-stage classification
// tables (StandingsView), the tie-break criteria modal (StandingsRulesCard), the
// best-third ranking (ThirdPlaceTable), and each group's collapsible match list
// (GroupMatchHistory). Keys are dotted `standings.*`. Keep broadcast voice in
// both languages.
import type { CatalogModule } from "./types";

export const standingsCatalog: CatalogModule = {
  pt: {
    // StandingsView — header
    "standings.title": "Tabela de Classificação",
    "standings.subtitle": "Fase de grupos • 12 chaves de 4 seleções",
    "standings.criteriaButtonTitle": "Critérios de classificação",
    "standings.criteria": "Critérios",

    // StandingsView — tooltip legend hint
    "standings.legendPrefix": "Toque ou passe o cursor sobre o",
    "standings.legendQualified": "(classificado),",
    "standings.legendEliminated": "(eliminado), sobre o",
    "standings.legendThirdHighlight": "3º em destaque",
    "standings.legendThirdHint": "(aguardando a definição dos 8 melhores terceiros) ou sobre o",
    "standings.legendPosition": "nº de posição",
    "standings.legendPositionHint":
      "(1º/2º ainda em disputa) para ver a análise matemática da situação de cada seleção.",

    // StandingsView — table columns
    "standings.col.pts": "PTS",
    "standings.col.sg": "SG",
    "standings.col.j": "J",
    "standings.col.v": "V",
    "standings.col.e": "E",
    "standings.col.d": "D",
    "standings.col.gf": "GF",
    "standings.col.ga": "GA",
    "standings.col.position": "Posição",
    "standings.col.team": "Equipe",

    // StandingsView — group card status
    "standings.live": "Ao Vivo",
    "standings.finished": "Encerrado",
    "standings.liveMatchLine": "{teamA} {scoreA}–{scoreB} {teamB} · em andamento",
    "standings.notPlayedYet": "Resultados da fase de grupos ainda não disputados",
    "standings.somePending": "Alguns confrontos deste grupo ainda não foram disputados",

    // StandingsView — row titles/notes
    "standings.rowTitleQualified": "Classificado matematicamente para o mata-mata",
    "standings.rowTitleEliminated": "Eliminado da fase de grupos",
    "standings.rowTitleAwaitingThird": "Aguardando a definição dos 8 melhores terceiros colocados",
    "standings.noteThirdQualified":
      "Terminou em 3º no {group} e avançou ao mata-mata como um dos 8 melhores terceiros colocados ({position}º entre os 12).",
    "standings.noteThirdEliminated":
      "Terminou em 3º no {group} e está eliminado — ficou fora dos 8 melhores terceiros colocados ({position}º entre os 12).",
    "standings.noteAwaitingThird":
      "Terminou em 3º no {group}. Os 8 melhores terceiros colocados avançam ao mata-mata — a definição só sai quando todos os grupos terminarem.{suffix}",
    "standings.noteAwaitingThirdSuffix":
      " Posição provisória entre os 12 terceiros: {position}º — {status}",
    "standings.noteAwaitingThirdInside": "dentro dos 8 que avançam.",
    "standings.noteAwaitingThirdOutside": "fora dos 8, por enquanto.",

    // StandingsView — group analysis section
    "standings.groupAnalysis": "Análise do grupo",

    // StandingsRulesCard
    "standings.rules.title": "Critérios de Classificação",
    "standings.rules.subtitle": "Artigo 13 · Regulamento FIFA WC 2026",
    "standings.rules.close": "Fechar",
    "standings.rules.intro":
      "Quando duas ou mais seleções estão empatadas em pontos ao final da fase de grupos, os critérios abaixo são aplicados em ordem.",
    "standings.rules.step1": "Passo 1",
    "standings.rules.step1Title": "Confronto direto",
    "standings.rules.step1Desc": "Apenas os jogos entre as seleções empatadas",
    "standings.rules.step1A": "Maior número de pontos entre si",
    "standings.rules.step1B": "Maior saldo de gols nos jogos entre si",
    "standings.rules.step1C": "Maior número de gols marcados nos jogos entre si",
    "standings.rules.step2": "Passo 2",
    "standings.rules.step2Title": "Se ainda empatadas",
    "standings.rules.step2Desc": "Critérios A–C reaplicados ao subgrupo restante; se ainda houver empate:",
    "standings.rules.step2D": "Maior saldo de gols em todos os jogos do grupo",
    "standings.rules.step2E": "Maior número de gols marcados em todos os jogos do grupo",
    "standings.rules.step2F": "Fair play — menor pontuação de infrações disciplinares:",
    "standings.rules.yellowCard": "Cartão amarelo",
    "standings.rules.yellowCardPts": "−1 pt",
    "standings.rules.indirectRed": "Vermelho indireto (2 amarelos)",
    "standings.rules.indirectRedPts": "−3 pts",
    "standings.rules.directRed": "Vermelho direto",
    "standings.rules.directRedPts": "−4 pts",
    "standings.rules.yellowPlusRed": "Amarelo + vermelho direto",
    "standings.rules.yellowPlusRedPts": "−5 pts",
    "standings.rules.step3": "Passo 3",
    "standings.rules.step3Title": "Última instância",
    "standings.rules.step3G": "Ranking FIFA/Coca-Cola Men's mais recente",
    "standings.rules.step3H": "Edições anteriores do ranking, retroativamente, até haver decisão",
    "standings.rules.best8Title": "Melhores 8 terceiros colocados",
    "standings.rules.best8Desc": "Critério separado — sem confronto direto:",
    "standings.rules.best8Order": "Pontos → Saldo de gols → Gols marcados → Fair play → Ranking FIFA",
    "standings.rules.officialLink": "Ver regulamento oficial da FIFA",

    // ThirdPlaceTable
    "standings.third.title": "Melhores 3º colocados",
    "standings.third.subtitle": "8 das 12 chaves avançam pelo 3º lugar · ranking provisório",
    "standings.third.colGroup": "Gr.",
    "standings.third.colTeam": "Equipe",
    "standings.third.colChance": "Chance",
    "standings.third.colChanceTitle": "Probabilidade simulada (Monte Carlo) de avançar ao mata-mata",
    "standings.third.colJTitle": "Jogos disputados (encerrados + em andamento)",
    "standings.third.colFpTitle":
      "Fair play (Art. 13.2f): −1 amarelo, −3 segundo amarelo, −4 vermelho direto",
    "standings.third.guaranteedTitle": "Classificação garantida ao mata-mata (100% nas simulações)",
    "standings.third.guaranteedAria": "Classificação garantida",
    "standings.third.eliminatedTitle": "Eliminado: 0% de chance de ficar entre os 8 melhores 3ºs",
    "standings.third.eliminatedAria": "Eliminado",
    "standings.third.chanceCellTitle": "Probabilidade simulada de avançar ao mata-mata",
    "standings.third.footnote":
      "A linha verde marca o corte dos 8 classificados. A coluna Chance é uma probabilidade simulada (Monte Carlo) de avançar ao mata-mata — palpite para a torcida, não cravada de resultado. A alocação oficial de cada 3º colocado às chaves do mata-mata só é definida ao fim da fase de grupos.",
    "standings.third.tooltipBase": "{name} · {ord}",
    "standings.third.tooltipOrd": "{rank}º melhor 3º colocado",
    "standings.third.tooltipGuaranteed": "{name} · {ord} — classificação ao mata-mata garantida.",
    "standings.third.tooltipEliminated":
      "{name} · {ord} — eliminado: sem cenários de ficar entre os 8 melhores 3ºs.",
    "standings.third.tooltipInside":
      "{name} · {ord} — dentro do corte provisório dos 8, mas sem vaga garantida ({pct}% nas simulações).",
    "standings.third.tooltipContention":
      "{name} · {ord} — fora do corte provisório dos 8, mas ainda na briga ({pct}% nas simulações).",

    // GroupMatchHistory
    "standings.history.title": "Histórico de jogos",
    "standings.history.openMatchTitle": "Abrir a partida {teamA} x {teamB}",
    "standings.history.openMatchAria": "Abrir a partida {teamA} contra {teamB}",
    "standings.history.live": "● ao vivo",
  },
  es: {
    // StandingsView — header
    "standings.title": "Tabla de Posiciones",
    "standings.subtitle": "Fase de grupos • 12 grupos de 4 selecciones",
    "standings.criteriaButtonTitle": "Criterios de clasificación",
    "standings.criteria": "Criterios",

    // StandingsView — tooltip legend hint
    "standings.legendPrefix": "Toca o pasa el cursor sobre el",
    "standings.legendQualified": "(clasificado),",
    "standings.legendEliminated": "(eliminado), sobre el",
    "standings.legendThirdHighlight": "3º destacado",
    "standings.legendThirdHint": "(a la espera de la definición de los 8 mejores terceros) o sobre el",
    "standings.legendPosition": "nº de posición",
    "standings.legendPositionHint":
      "(1º/2º aún en disputa) para ver el análisis matemático de la situación de cada selección.",

    // StandingsView — table columns
    "standings.col.pts": "PTS",
    "standings.col.sg": "DG",
    "standings.col.j": "PJ",
    "standings.col.v": "G",
    "standings.col.e": "E",
    "standings.col.d": "P",
    "standings.col.gf": "GF",
    "standings.col.ga": "GC",
    "standings.col.position": "Posición",
    "standings.col.team": "Equipo",

    // StandingsView — group card status
    "standings.live": "En Vivo",
    "standings.finished": "Finalizado",
    "standings.liveMatchLine": "{teamA} {scoreA}–{scoreB} {teamB} · en curso",
    "standings.notPlayedYet": "Resultados de la fase de grupos aún no disputados",
    "standings.somePending": "Algunos partidos de este grupo aún no se han disputado",

    // StandingsView — row titles/notes
    "standings.rowTitleQualified": "Clasificado matemáticamente a las eliminatorias",
    "standings.rowTitleEliminated": "Eliminado de la fase de grupos",
    "standings.rowTitleAwaitingThird": "A la espera de la definición de los 8 mejores terceros",
    "standings.noteThirdQualified":
      "Terminó 3º en el {group} y avanzó a las eliminatorias como uno de los 8 mejores terceros ({position}º entre los 12).",
    "standings.noteThirdEliminated":
      "Terminó 3º en el {group} y está eliminado — quedó fuera de los 8 mejores terceros ({position}º entre los 12).",
    "standings.noteAwaitingThird":
      "Terminó 3º en el {group}. Los 8 mejores terceros avanzan a las eliminatorias — la definición solo sale cuando todos los grupos terminen.{suffix}",
    "standings.noteAwaitingThirdSuffix":
      " Posición provisional entre los 12 terceros: {position}º — {status}",
    "standings.noteAwaitingThirdInside": "dentro de los 8 que avanzan.",
    "standings.noteAwaitingThirdOutside": "fuera de los 8, por ahora.",

    // StandingsView — group analysis section
    "standings.groupAnalysis": "Análisis del grupo",

    // StandingsRulesCard
    "standings.rules.title": "Criterios de Clasificación",
    "standings.rules.subtitle": "Artículo 13 · Reglamento FIFA WC 2026",
    "standings.rules.close": "Cerrar",
    "standings.rules.intro":
      "Cuando dos o más selecciones están empatadas en puntos al final de la fase de grupos, los criterios de abajo se aplican en orden.",
    "standings.rules.step1": "Paso 1",
    "standings.rules.step1Title": "Enfrentamiento directo",
    "standings.rules.step1Desc": "Solo los partidos entre las selecciones empatadas",
    "standings.rules.step1A": "Mayor número de puntos entre sí",
    "standings.rules.step1B": "Mayor diferencia de goles en los partidos entre sí",
    "standings.rules.step1C": "Mayor número de goles marcados en los partidos entre sí",
    "standings.rules.step2": "Paso 2",
    "standings.rules.step2Title": "Si siguen empatadas",
    "standings.rules.step2Desc": "Criterios A–C reaplicados al subgrupo restante; si aún hay empate:",
    "standings.rules.step2D": "Mayor diferencia de goles en todos los partidos del grupo",
    "standings.rules.step2E": "Mayor número de goles marcados en todos los partidos del grupo",
    "standings.rules.step2F": "Fair play — menor puntuación de infracciones disciplinarias:",
    "standings.rules.yellowCard": "Tarjeta amarilla",
    "standings.rules.yellowCardPts": "−1 pt",
    "standings.rules.indirectRed": "Roja indirecta (2 amarillas)",
    "standings.rules.indirectRedPts": "−3 pts",
    "standings.rules.directRed": "Roja directa",
    "standings.rules.directRedPts": "−4 pts",
    "standings.rules.yellowPlusRed": "Amarilla + roja directa",
    "standings.rules.yellowPlusRedPts": "−5 pts",
    "standings.rules.step3": "Paso 3",
    "standings.rules.step3Title": "Última instancia",
    "standings.rules.step3G": "Ranking FIFA/Coca-Cola Men's más reciente",
    "standings.rules.step3H": "Ediciones anteriores del ranking, retroactivamente, hasta que haya decisión",
    "standings.rules.best8Title": "Mejores 8 terceros",
    "standings.rules.best8Desc": "Criterio aparte — sin enfrentamiento directo:",
    "standings.rules.best8Order": "Puntos → Diferencia de goles → Goles marcados → Fair play → Ranking FIFA",
    "standings.rules.officialLink": "Ver el reglamento oficial de la FIFA",

    // ThirdPlaceTable
    "standings.third.title": "Mejores terceros",
    "standings.third.subtitle": "8 de los 12 grupos avanzan por el 3º puesto · ranking provisional",
    "standings.third.colGroup": "Gr.",
    "standings.third.colTeam": "Equipo",
    "standings.third.colChance": "Chance",
    "standings.third.colChanceTitle": "Probabilidad simulada (Monte Carlo) de avanzar a las eliminatorias",
    "standings.third.colJTitle": "Partidos disputados (finalizados + en curso)",
    "standings.third.colFpTitle":
      "Fair play (Art. 13.2f): −1 amarilla, −3 segunda amarilla, −4 roja directa",
    "standings.third.guaranteedTitle": "Clasificación garantizada a las eliminatorias (100% en las simulaciones)",
    "standings.third.guaranteedAria": "Clasificación garantizada",
    "standings.third.eliminatedTitle": "Eliminado: 0% de chance de quedar entre los 8 mejores terceros",
    "standings.third.eliminatedAria": "Eliminado",
    "standings.third.chanceCellTitle": "Probabilidad simulada de avanzar a las eliminatorias",
    "standings.third.footnote":
      "La línea verde marca el corte de los 8 clasificados. La columna Chance es una probabilidad simulada (Monte Carlo) de avanzar a las eliminatorias — un pronóstico para la afición, no un resultado cerrado. La asignación oficial de cada tercero a los cruces de las eliminatorias solo se define al final de la fase de grupos.",
    "standings.third.tooltipBase": "{name} · {ord}",
    "standings.third.tooltipOrd": "{rank}º mejor tercero",
    "standings.third.tooltipGuaranteed": "{name} · {ord} — clasificación a las eliminatorias garantizada.",
    "standings.third.tooltipEliminated":
      "{name} · {ord} — eliminado: sin escenarios de quedar entre los 8 mejores terceros.",
    "standings.third.tooltipInside":
      "{name} · {ord} — dentro del corte provisional de los 8, pero sin cupo garantizado ({pct}% en las simulaciones).",
    "standings.third.tooltipContention":
      "{name} · {ord} — fuera del corte provisional de los 8, pero aún en la pelea ({pct}% en las simulaciones).",

    // GroupMatchHistory
    "standings.history.title": "Historial de partidos",
    "standings.history.openMatchTitle": "Abrir el partido {teamA} x {teamB}",
    "standings.history.openMatchAria": "Abrir el partido {teamA} contra {teamB}",
    "standings.history.live": "● en vivo",
  },
  en: {
    // StandingsView — header
    "standings.title": "Standings Table",
    "standings.subtitle": "Group Stage • 12 groups of 4 teams",
    "standings.criteriaButtonTitle": "Qualification criteria",
    "standings.criteria": "Criteria",

    // StandingsView — tooltip legend hint
    "standings.legendPrefix": "Tap or hover over the",
    "standings.legendQualified": "(qualified),",
    "standings.legendEliminated": "(eliminated), over the",
    "standings.legendThirdHighlight": "3rd highlighted",
    "standings.legendThirdHint": "(awaiting the 8 best third-place finishers) or over the",
    "standings.legendPosition": "position no.",
    "standings.legendPositionHint":
      "(1st/2nd still up for grabs) to see the mathematical breakdown of each team's situation.",

    // StandingsView — table columns
    "standings.col.pts": "PTS",
    "standings.col.sg": "GD",
    "standings.col.j": "P",
    "standings.col.v": "W",
    "standings.col.e": "D",
    "standings.col.d": "L",
    "standings.col.gf": "GF",
    "standings.col.ga": "GA",
    "standings.col.position": "Position",
    "standings.col.team": "Team",

    // StandingsView — group card status
    "standings.live": "Live",
    "standings.finished": "Finished",
    "standings.liveMatchLine": "{teamA} {scoreA}–{scoreB} {teamB} · in progress",
    "standings.notPlayedYet": "Group-stage results not played yet",
    "standings.somePending": "Some matchups in this group haven't been played yet",

    // StandingsView — row titles/notes
    "standings.rowTitleQualified": "Mathematically qualified for the knockout stage",
    "standings.rowTitleEliminated": "Eliminated from the group stage",
    "standings.rowTitleAwaitingThird": "Awaiting the 8 best third-place finishers",
    "standings.noteThirdQualified":
      "Finished 3rd in {group} and advanced to the knockout stage as one of the 8 best third-place finishers ({position} of the 12).",
    "standings.noteThirdEliminated":
      "Finished 3rd in {group} and is eliminated — fell short of the 8 best third-place finishers ({position} of the 12).",
    "standings.noteAwaitingThird":
      "Finished 3rd in {group}. The 8 best third-place finishers advance to the knockout stage — the cut is only set once every group wraps up.{suffix}",
    "standings.noteAwaitingThirdSuffix":
      " Provisional position among the 12 third-place teams: {position} — {status}",
    "standings.noteAwaitingThirdInside": "inside the 8 that advance.",
    "standings.noteAwaitingThirdOutside": "outside the 8, for now.",

    // StandingsView — group analysis section
    "standings.groupAnalysis": "Group analysis",

    // StandingsRulesCard
    "standings.rules.title": "Qualification Criteria",
    "standings.rules.subtitle": "Article 13 · FIFA WC 2026 Regulations",
    "standings.rules.close": "Close",
    "standings.rules.intro":
      "When two or more teams are tied on points at the end of the group stage, the criteria below are applied in order.",
    "standings.rules.step1": "Step 1",
    "standings.rules.step1Title": "Head-to-head",
    "standings.rules.step1Desc": "Only the matches between the tied teams",
    "standings.rules.step1A": "Most points among them",
    "standings.rules.step1B": "Best goal difference in the matches among them",
    "standings.rules.step1C": "Most goals scored in the matches among them",
    "standings.rules.step2": "Step 2",
    "standings.rules.step2Title": "If still tied",
    "standings.rules.step2Desc": "Criteria A–C reapplied to the remaining subgroup; if still tied:",
    "standings.rules.step2D": "Best goal difference across all group matches",
    "standings.rules.step2E": "Most goals scored across all group matches",
    "standings.rules.step2F": "Fair play — lowest disciplinary points total:",
    "standings.rules.yellowCard": "Yellow card",
    "standings.rules.yellowCardPts": "−1 pt",
    "standings.rules.indirectRed": "Indirect red (2 yellows)",
    "standings.rules.indirectRedPts": "−3 pts",
    "standings.rules.directRed": "Direct red",
    "standings.rules.directRedPts": "−4 pts",
    "standings.rules.yellowPlusRed": "Yellow + direct red",
    "standings.rules.yellowPlusRedPts": "−5 pts",
    "standings.rules.step3": "Step 3",
    "standings.rules.step3Title": "Last resort",
    "standings.rules.step3G": "Most recent FIFA/Coca-Cola Men's Ranking",
    "standings.rules.step3H": "Prior ranking editions, retroactively, until a decision is reached",
    "standings.rules.best8Title": "8 best third-place finishers",
    "standings.rules.best8Desc": "Separate criterion — no head-to-head:",
    "standings.rules.best8Order": "Points → Goal difference → Goals scored → Fair play → FIFA Ranking",
    "standings.rules.officialLink": "See the official FIFA regulations",

    // ThirdPlaceTable
    "standings.third.title": "Best 3rd-place finishers",
    "standings.third.subtitle": "8 of the 12 groups advance via 3rd place · provisional ranking",
    "standings.third.colGroup": "Grp.",
    "standings.third.colTeam": "Team",
    "standings.third.colChance": "Chance",
    "standings.third.colChanceTitle": "Simulated probability (Monte Carlo) of advancing to the knockout stage",
    "standings.third.colJTitle": "Matches played (finished + in progress)",
    "standings.third.colFpTitle":
      "Fair play (Art. 13.2f): −1 yellow, −3 second yellow, −4 direct red",
    "standings.third.guaranteedTitle": "Guaranteed spot in the knockout stage (100% in the simulations)",
    "standings.third.guaranteedAria": "Guaranteed qualification",
    "standings.third.eliminatedTitle": "Eliminated: 0% chance of landing among the 8 best 3rd-place finishers",
    "standings.third.eliminatedAria": "Eliminated",
    "standings.third.chanceCellTitle": "Simulated probability of advancing to the knockout stage",
    "standings.third.footnote":
      "The green line marks the cut for the 8 qualifiers. The Chance column is a simulated probability (Monte Carlo) of advancing to the knockout stage — a call for the fans, not a locked result. The official assignment of each 3rd-place team to the knockout bracket is only set once the group stage ends.",
    "standings.third.tooltipBase": "{name} · {ord}",
    "standings.third.tooltipOrd": "{rank} best 3rd-place finisher",
    "standings.third.tooltipGuaranteed": "{name} · {ord} — knockout-stage qualification guaranteed.",
    "standings.third.tooltipEliminated":
      "{name} · {ord} — eliminated: no scenarios for landing among the 8 best 3rd-place finishers.",
    "standings.third.tooltipInside":
      "{name} · {ord} — inside the provisional cut of 8, but no guaranteed spot ({pct}% in the simulations).",
    "standings.third.tooltipContention":
      "{name} · {ord} — outside the provisional cut of 8, but still in the hunt ({pct}% in the simulations).",

    // GroupMatchHistory
    "standings.history.title": "Match history",
    "standings.history.openMatchTitle": "Open the {teamA} vs {teamB} match",
    "standings.history.openMatchAria": "Open the {teamA} against {teamB} match",
    "standings.history.live": "● live",
  },
};
