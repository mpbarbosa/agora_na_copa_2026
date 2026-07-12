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

    // knockoutSlots.ts — unresolved feeder-slot placeholder labels
    "utils.slot.pos1": "1º {group}",
    "utils.slot.pos2": "2º {group}",
    "utils.slot.bestThird": "Melhor 3º · {groups}",
    "utils.slot.winner": "Vencedor #{n}",
    "utils.slot.loser": "Perdedor #{n}",
    "utils.slot.bestThirdDesc": "Um dos melhores terceiros colocados — dos grupos {groups}",
    "utils.slot.orConnector": " ou ",
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

    // knockoutSlots.ts — unresolved feeder-slot placeholder labels
    "utils.slot.pos1": "1º {group}",
    "utils.slot.pos2": "2º {group}",
    "utils.slot.bestThird": "Mejor 3º · {groups}",
    "utils.slot.winner": "Ganador #{n}",
    "utils.slot.loser": "Perdedor #{n}",
    "utils.slot.bestThirdDesc": "Uno de los mejores terceros — de los grupos {groups}",
    "utils.slot.orConnector": " o ",
  },
  en: {
    // teamTournamentStatus.ts
    "utils.classifiedFor": "Qualified for {stage}",
    "utils.champion": "Champions",
    "utils.runnerUp": "Runners-up",
    "utils.thirdPlace": "3rd place",
    "utils.fourthPlace": "4th place",
    "utils.eliminatedIn": "Eliminated in {stage}",
    "utils.eliminatedGroupStage": "Eliminated in the group stage",

    // matchResult.ts
    "utils.pointsOne": "+1 pt",
    "utils.pointsMany": "+{pts} pts",
    "utils.pointsZero": "0 pts",
    "utils.runnerUpShort": "Runners-up",
    "utils.qualified": "Qualified",
    "utils.eliminated": "Eliminated",

    // playerDisplay.ts
    "utils.positionGK": "Goalkeeper",
    "utils.positionDF": "Defender",
    "utils.positionMF": "Midfielder",
    "utils.positionFW": "Forward",

    // dateFormat.ts
    "utils.updatedOn": "Updated on {stamp}",

    // knockoutSlots.ts
    "utils.stage.group": "Group Stage",
    "utils.stage.R32": "Round of 32",
    "utils.stage.R16": "Round of 16",
    "utils.stage.QF": "Quarterfinals",
    "utils.stage.SF": "Semifinals",
    "utils.stage.TP": "Third-Place Match",
    "utils.stage.F": "Final",

    // knockoutSlots.ts — unresolved feeder-slot placeholder labels
    "utils.slot.pos1": "1st {group}",
    "utils.slot.pos2": "2nd {group}",
    "utils.slot.bestThird": "Best 3rd · {groups}",
    "utils.slot.winner": "Winner #{n}",
    "utils.slot.loser": "Loser #{n}",
    "utils.slot.bestThirdDesc": "One of the best third-placed teams — from groups {groups}",
    "utils.slot.orConnector": " or ",
  },
};
