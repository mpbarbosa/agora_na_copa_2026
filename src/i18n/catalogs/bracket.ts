// Bracket catalog — the "Chaveamento" tab: the per-stage knockout columns
// (BracketView), the symmetric full bracket (FullBracketView) and the match
// predictor panel (BracketPredictorPanel). Keys are prefixed `bracket.`.
// pt is the complete reference; es is LATAM football voice.
import type { CatalogModule } from "./types";

export const bracketCatalog: CatalogModule = {
  pt: {
    // Stage labels (per-stage columns)
    "bracket.stage.R32": "16 avos",
    "bracket.stage.R16": "Oitavas",
    "bracket.stage.QF": "Quartas",
    "bracket.stage.SF": "Semifinais",
    "bracket.stage.TP": "3º lugar",
    "bracket.stage.F": "Final",

    // Stage labels (short, full-bracket column headers)
    "bracket.stageShort.R32": "16-avos",
    "bracket.stageShort.R16": "Oitavas",
    "bracket.stageShort.QF": "Quartas",
    "bracket.stageShort.SF": "Semis",
    "bracket.stageShort.TP": "3º lugar",
    "bracket.stageShort.F": "Final",

    // Slot row markers
    "bracket.slot.qualified": "Classificado",
    "bracket.slot.eliminated": "Eliminado",
    "bracket.slot.provisionalShort": "prov.",
    "bracket.slot.viewTeam": "Ver seleção {name}",

    // Column subheading (confronto count)
    "bracket.column.confrontoSingular": "{count} confronto",
    "bracket.column.confrontoPlural": "{count} confrontos",
    "bracket.column.finalSummary": "Grande final em East Rutherford",
    "bracket.column.thirdPlaceSummary": "Disputa do 3º lugar",

    // View header
    "bracket.title": "Mata-mata da Copa",
    "bracket.subtitle":
      "Tabela oficial da FIFA • datas no horário de Brasília • vagas dos 16 avos preenchidas provisoriamente pela classificação atual",
    "bracket.route.title": "Rota até MetLife Stadium",
    "bracket.route.subtitle": "East Rutherford • 16 avos → final • inclui a disputa do 3º lugar",

    // View toggle
    "bracket.toggle.aria": "Modo de visualização do mata-mata",
    "bracket.toggle.columns": "Colunas",
    "bracket.toggle.full": "Chave completa",

    // Legend
    "bracket.legend.qualified": "Classificado",
    "bracket.legend.provisional": "prov. Provisório",
    "bracket.legend.bestThird": "Melhor 3º",
    "bracket.legend.officialLabels": "Demais vagas: rótulos oficiais",

    // Full bracket
    "bracket.full.openTeam": "Abrir seleção {name}",
    "bracket.full.rotateHint":
      "Gire o celular para o modo horizontal para ver a chave completa",

    // Predictor panel
    "bracket.predictor.title": "Palpite do confronto",
    "bracket.predictor.subtitle":
      "Escolha um cruzamento já definido do mata-mata e gere um prognóstico por um modelo estatístico (Poisson/Dixon-Coles) sobre a campanha atual das seleções.",
    "bracket.predictor.simulated": "Simulado",
    "bracket.predictor.empty":
      "Nenhum confronto do mata-mata tem as duas vagas definidas ainda. Assim que a classificação preencher os dois lados de um jogo, o palpite aparece aqui.",
    "bracket.predictor.confrontoLabel": "Confronto",
    "bracket.predictor.loading": "Gerando palpite…",
    "bracket.predictor.simulatedBadge": "Palpite simulado",
    "bracket.predictor.prognosisFallback": "Prognóstico",
    "bracket.predictor.error":
      "Não foi possível gerar o palpite agora. Tente escolher o confronto novamente.",
  },
  es: {
    // Stage labels (per-stage columns)
    "bracket.stage.R32": "16avos",
    "bracket.stage.R16": "Octavos",
    "bracket.stage.QF": "Cuartos",
    "bracket.stage.SF": "Semifinales",
    "bracket.stage.TP": "3º puesto",
    "bracket.stage.F": "Final",

    // Stage labels (short, full-bracket column headers)
    "bracket.stageShort.R32": "16avos",
    "bracket.stageShort.R16": "Octavos",
    "bracket.stageShort.QF": "Cuartos",
    "bracket.stageShort.SF": "Semis",
    "bracket.stageShort.TP": "3º puesto",
    "bracket.stageShort.F": "Final",

    // Slot row markers
    "bracket.slot.qualified": "Clasificado",
    "bracket.slot.eliminated": "Eliminado",
    "bracket.slot.provisionalShort": "prov.",
    "bracket.slot.viewTeam": "Ver selección {name}",

    // Column subheading (confronto count)
    "bracket.column.confrontoSingular": "{count} cruce",
    "bracket.column.confrontoPlural": "{count} cruces",
    "bracket.column.finalSummary": "Gran final en East Rutherford",
    "bracket.column.thirdPlaceSummary": "Partido por el tercer puesto",

    // View header
    "bracket.title": "Eliminatorias del Mundial",
    "bracket.subtitle":
      "Cuadro oficial de la FIFA • fechas en horario de Brasilia • cupos de los 16avos completados provisionalmente según la clasificación actual",
    "bracket.route.title": "Ruta al MetLife Stadium",
    "bracket.route.subtitle": "East Rutherford • 16avos → final • incluye el partido por el tercer puesto",

    // View toggle
    "bracket.toggle.aria": "Modo de visualización de las eliminatorias",
    "bracket.toggle.columns": "Columnas",
    "bracket.toggle.full": "Cuadro completo",

    // Legend
    "bracket.legend.qualified": "Clasificado",
    "bracket.legend.provisional": "prov. Provisional",
    "bracket.legend.bestThird": "Mejor 3º",
    "bracket.legend.officialLabels": "Demás cupos: etiquetas oficiales",

    // Full bracket
    "bracket.full.openTeam": "Abrir selección {name}",
    "bracket.full.rotateHint":
      "Gira el teléfono al modo horizontal para ver el cuadro completo",

    // Predictor panel
    "bracket.predictor.title": "Pronóstico del cruce",
    "bracket.predictor.subtitle":
      "Elige un cruce ya definido de las eliminatorias y genera un pronóstico con un modelo estadístico (Poisson/Dixon-Coles) sobre la campaña actual de las selecciones.",
    "bracket.predictor.simulated": "Simulado",
    "bracket.predictor.empty":
      "Ningún cruce de las eliminatorias tiene los dos cupos definidos todavía. En cuanto la clasificación complete los dos lados de un partido, el pronóstico aparece aquí.",
    "bracket.predictor.confrontoLabel": "Cruce",
    "bracket.predictor.loading": "Generando pronóstico…",
    "bracket.predictor.simulatedBadge": "Pronóstico simulado",
    "bracket.predictor.prognosisFallback": "Pronóstico",
    "bracket.predictor.error":
      "No se pudo generar el pronóstico ahora. Intenta elegir el cruce nuevamente.",
  },
  en: {
    // Stage labels (per-stage columns)
    "bracket.stage.R32": "Round of 32",
    "bracket.stage.R16": "Round of 16",
    "bracket.stage.QF": "Quarterfinals",
    "bracket.stage.SF": "Semifinals",
    "bracket.stage.TP": "3rd place",
    "bracket.stage.F": "Final",

    // Stage labels (short, full-bracket column headers)
    "bracket.stageShort.R32": "Round of 32",
    "bracket.stageShort.R16": "Round of 16",
    "bracket.stageShort.QF": "Quarters",
    "bracket.stageShort.SF": "Semis",
    "bracket.stageShort.TP": "3rd place",
    "bracket.stageShort.F": "Final",

    // Slot row markers
    "bracket.slot.qualified": "Qualified",
    "bracket.slot.eliminated": "Eliminated",
    "bracket.slot.provisionalShort": "prov.",
    "bracket.slot.viewTeam": "View {name} team",

    // Column subheading (confronto count)
    "bracket.column.confrontoSingular": "{count} matchup",
    "bracket.column.confrontoPlural": "{count} matchups",
    "bracket.column.finalSummary": "Grand final in East Rutherford",
    "bracket.column.thirdPlaceSummary": "Third-Place Match",

    // View header
    "bracket.title": "World Cup Knockout",
    "bracket.subtitle":
      "Official FIFA bracket • dates in Brasília time • Round of 32 spots filled provisionally by the current standings",
    "bracket.route.title": "Road to MetLife Stadium",
    "bracket.route.subtitle": "East Rutherford • Round of 32 → final • includes the Third-Place Match",

    // View toggle
    "bracket.toggle.aria": "Knockout view mode",
    "bracket.toggle.columns": "Columns",
    "bracket.toggle.full": "Full bracket",

    // Legend
    "bracket.legend.qualified": "Qualified",
    "bracket.legend.provisional": "prov. Provisional",
    "bracket.legend.bestThird": "Best 3rd",
    "bracket.legend.officialLabels": "Other spots: official labels",

    // Full bracket
    "bracket.full.openTeam": "Open {name} team",
    "bracket.full.rotateHint":
      "Rotate your phone to landscape mode to see the full bracket",

    // Predictor panel
    "bracket.predictor.title": "Matchup prediction",
    "bracket.predictor.subtitle":
      "Pick a knockout matchup that's already set and generate a prediction from a statistical model (Poisson/Dixon-Coles) based on the teams' current campaign.",
    "bracket.predictor.simulated": "Simulated",
    "bracket.predictor.empty":
      "No knockout matchup has both spots set yet. As soon as the standings fill both sides of a match, the prediction shows up here.",
    "bracket.predictor.confrontoLabel": "Matchup",
    "bracket.predictor.loading": "Generating prediction…",
    "bracket.predictor.simulatedBadge": "Simulated prediction",
    "bracket.predictor.prognosisFallback": "Prediction",
    "bracket.predictor.error":
      "Couldn't generate the prediction right now. Try picking the matchup again.",
  },
};
