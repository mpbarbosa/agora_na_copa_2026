// Shared display-string utilities catalog — the pure helper functions under
// src/utils/ that RETURN user-facing labels (tournament status, position labels,
// finished-match result lines, points copy). Called from many components, so
// these strings live here rather than in any single view module. Keys are
// prefixed `utils.`. pt is the complete reference; es is LATAM football voice.
//
// Note: the `{stage}` interpolated into `classifiedFor`/`eliminatedIn` is the
// pt-BR knockout stage name from KNOCKOUT_STAGE_NAMES (a separate util); the
// es templates read naturally around it either way.
import type { CatalogModule } from "./types";

export const utilsCatalog: CatalogModule = {
  pt: {
    // teamTournamentStatus.ts — team tournament-status labels
    "utils.classifiedFor": "Classificado para {stage}",
    "utils.champion": "Campeão",
    "utils.runnerUp": "Vice-campeão",
    "utils.thirdPlace": "3º lugar",
    "utils.fourthPlace": "4º lugar",
    "utils.eliminatedIn": "Eliminado em {stage}",
    "utils.eliminatedGroupStage": "Eliminada na fase de grupos",

    // matchResult.ts — finished-match per-side result line + points copy
    "utils.pointsOne": "+1 pt",
    "utils.pointsMany": "+{pts} pts",
    "utils.pointsZero": "0 pts",
    "utils.runnerUpShort": "Vice",
    "utils.qualified": "Classificado",
    "utils.eliminated": "Eliminado",

    // playerDisplay.ts — pitch position labels
    "utils.positionGK": "Goleiro",
    "utils.positionDF": "Defensor",
    "utils.positionMF": "Meio-Campista",
    "utils.positionFW": "Atacante",

    // dateFormat.ts — editorial "Atualizado em …" stamp
    "utils.updatedOn": "Atualizado em {stamp}",

    // knockoutSlots.ts — stage names (also used as the {stage} above)
    "utils.stage.group": "Fase de Grupos",
    "utils.stage.R32": "16 Avos de Final",
    "utils.stage.R16": "Oitavas de Final",
    "utils.stage.QF": "Quartas de Final",
    "utils.stage.SF": "Semifinal",
    "utils.stage.TP": "Disputa do 3º Lugar",
    "utils.stage.F": "Final",
  },
  es: {
    // teamTournamentStatus.ts
    "utils.classifiedFor": "Clasificado a {stage}",
    "utils.champion": "Campeón",
    "utils.runnerUp": "Subcampeón",
    "utils.thirdPlace": "3er lugar",
    "utils.fourthPlace": "4º lugar",
    "utils.eliminatedIn": "Eliminado en {stage}",
    "utils.eliminatedGroupStage": "Eliminado en la fase de grupos",

    // matchResult.ts
    "utils.pointsOne": "+1 pt",
    "utils.pointsMany": "+{pts} pts",
    "utils.pointsZero": "0 pts",
    "utils.runnerUpShort": "Subcampeón",
    "utils.qualified": "Clasificado",
    "utils.eliminated": "Eliminado",

    // playerDisplay.ts
    "utils.positionGK": "Arquero",
    "utils.positionDF": "Defensa",
    "utils.positionMF": "Mediocampista",
    "utils.positionFW": "Delantero",

    // dateFormat.ts
    "utils.updatedOn": "Actualizado el {stamp}",

    // knockoutSlots.ts
    "utils.stage.group": "Fase de grupos",
    "utils.stage.R32": "Dieciseisavos de final",
    "utils.stage.R16": "Octavos de final",
    "utils.stage.QF": "Cuartos de final",
    "utils.stage.SF": "Semifinal",
    "utils.stage.TP": "Tercer puesto",
    "utils.stage.F": "Final",
  },
};
