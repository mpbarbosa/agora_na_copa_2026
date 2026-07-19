/**
 * Hand-maintained RESULTS for knockout fixtures, keyed by FIFA match number (73…104).
 *
 * The generated `knockoutBracket.json` carries only the pairings — the FIFA calendar
 * generator (`scripts/build-knockout-bracket.py`) never writes scores — and the live
 * `/api/match-overlays` overlay only reaches the bracket *after* the Ao Vivo / Partidas
 * views load it into the shared `matches` state. On a cold visit straight to Chaveamento,
 * a finished tie would otherwise still read PRE_GAME, so its later-round feeder slot would
 * show "Vencedor #NN" instead of the team that advanced.
 *
 * Seeding the real result here lets `buildKnockoutMatch` mark the fixture FINISHED so
 * `BracketView` resolves the tie's winner/loser independently of live-sync timing
 * (e.g. #90's "W73" slot → Canadá, once #73 ends). The live overlay later supplies the
 * same numbers, so the two never conflict.
 *
 * `score.teamA` / `score.teamB` align with `knockoutBracket.json`'s `slotA` / `slotB`
 * (teamA = home / slotA, teamB = away / slotB) — the same orientation the overlay uses.
 *
 * This seed LAGS reality — reconcile against production before trusting it:
 *   python3 scripts/fetch-match-incidents.py ko-<n>-2026
 *
 * Penalty shoot-outs: a tie level after regular/extra time carries the real `penaltyScore`
 * so the bracket resolves who advanced (`knockoutWinnerSlot` reads it) — the penalty tally
 * is real data, not an invented winner. A 1–1 tie seeds `score: { 1, 1 }` (its two open-play
 * goals still count toward `aggregateGoalsByPhase`) plus `penaltyScore`. Never seed a level
 * tie WITHOUT a `penaltyScore`: without the tally the app can't tell who advanced and must
 * not guess (the slot stays "Vencedor #NN" until the live overlay supplies it).
 */
export interface KnockoutResultSeed {
  status: "LIVE" | "FINISHED";
  score: { teamA: number; teamB: number };
  /**
   * Penalty shoot-out tally, set only when a tie was level after regular/extra time and
   * decided on penalties. The side with the higher `penaltyScore` advanced.
   */
  penaltyScore?: { teamA: number; teamB: number };
  /** Optional FIFA period/clock label for a LIVE tie (e.g. "2º tempo", "44'"). */
  matchTime?: string;
}

export const KNOCKOUT_RESULTS: Record<number, KnockoutResultSeed> = {
  // #73 · 16-avos · Los Angeles Stadium · 28/06/2026 — África do Sul 0×1 Canadá
  // (Stephen Eustáquio aos 90+2'). Canadá classificado; alimenta a Oitavas #90 (slot W73).
  73: { status: "FINISHED", score: { teamA: 0, teamB: 1 } },
  // #74 · 16-avos · Alemanha 1×1 Paraguai (Havertz 54' p/ ALE; Enciso 42' p/ PAR), Paraguai
  // 4×3 nos pênaltis. Paraguai classificado; alimenta a Oitavas #90 (slot W74).
  74: { status: "FINISHED", score: { teamA: 1, teamB: 1 }, penaltyScore: { teamA: 3, teamB: 4 } },
  // #75 · 16-avos · Holanda 1×1 Marrocos (Gakpo 72' p/ HOL; Issa Diop 90+1' p/ MAR), Marrocos
  // 3×2 nos pênaltis. Marrocos classificado; alimenta a Oitavas #91 (slot W75).
  75: { status: "FINISHED", score: { teamA: 1, teamB: 1 }, penaltyScore: { teamA: 2, teamB: 3 } },
  // #76 · 16-avos · 29/06/2026 — Brasil 2×1 Japão (Sano 29' p/ JPN; Casemiro 56' e
  // Gabriel Martinelli 90+5' p/ BRA). Brasil classificado; alimenta a Oitavas #91 (slot W76).
  76: { status: "FINISHED", score: { teamA: 2, teamB: 1 } },
  // #77 · 16-avos · França 3×0 Suécia (Kylian Mbappé 45' e 74', Bradley Barcola 53').
  // França classificada; alimenta a Oitavas #89 (slot W77).
  77: { status: "FINISHED", score: { teamA: 3, teamB: 0 } },
  // #78 · 16-avos · Costa do Marfim 1×2 Noruega (Amad Diallo 74' p/ CIV; Antonio Nusa 39' e
  // Erling Haaland 86' p/ NOR). Noruega classificada; alimenta a Oitavas #91 (slot W78).
  78: { status: "FINISHED", score: { teamA: 1, teamB: 2 } },
  // #79 · 16-avos · 30/06/2026 (início adiado para as 23h por chuva) — México 2×0 Equador
  // (Julian Quiñones 22', Raúl Jiménez 31'; Piero Hincapié expulso aos 90+5' p/ EQU).
  // México classificado; alimenta a Oitavas #92 (slot W79).
  79: { status: "FINISHED", score: { teamA: 2, teamB: 0 } },
  // #80 · 16-avos · Atlanta Stadium · 01/07/2026 — Inglaterra 2×1 RD Congo (Brian Cipenga 7'
  // p/ COD; Harry Kane 75' e 86' p/ ING). Inglaterra virou e se classificou; alimenta a
  // Oitavas #92 (slot W80).
  80: { status: "FINISHED", score: { teamA: 2, teamB: 1 } },
  // #81 · 16-avos · 01/07/2026 — Estados Unidos 2×0 Bósnia e Herzegovina (Folarin Balogun 45',
  // expulso aos 64'; Malik Tillman 82'). EUA classificados mesmo com um a menos; alimentam a
  // Oitavas #94 (slot W81).
  81: { status: "FINISHED", score: { teamA: 2, teamB: 0 } },
  // #82 · 16-avos · 01/07/2026 — Bélgica 3×2 Senegal na prorrogação (Habib Diarra 24' e Ismaila
  // Sarr 51' p/ SEN; Romelu Lukaku 86', Youri Tielemans 89' e 120+5' p/ BEL). Bélgica virou de
  // 0×2 e se classificou; alimenta a Oitavas #94 (slot W82).
  82: { status: "FINISHED", score: { teamA: 3, teamB: 2 } },
  // #83 · 16-avos · 02/07/2026 — Portugal 2×1 Croácia (Ivan Perisic 53' p/ CRO; Cristiano
  // Ronaldo 68' de pênalti e Gonçalo Ramos 90+4' p/ POR). Portugal virou nos acréscimos;
  // alimenta a Oitavas #93 (slot W83).
  83: { status: "FINISHED", score: { teamA: 2, teamB: 1 } },
  // #84 · 16-avos · 02/07/2026 — Espanha 3×0 Áustria (Mikel Oyarzabal 36' e 89', Pedro Porro
  // 66'). Espanha classificada com autoridade; alimenta a Oitavas #93 (slot W84).
  84: { status: "FINISHED", score: { teamA: 3, teamB: 0 } },
  // #85 · 16-avos · BC Place Vancouver · 03/07/2026 — Suíça 2×0 Argélia (Breel Embolo 10',
  // Dan Ndoye 46'). Suíça classificada; alimenta a Oitavas #96 (slot W85).
  85: { status: "FINISHED", score: { teamA: 2, teamB: 0 } },
  // #86 · 16-avos · Miami Stadium · 03/07/2026 — Argentina 3×2 Cabo Verde na prorrogação
  // (Lionel Messi 29', Lisandro Martínez 92' e gol contra de Diney Borges 111' p/ ARG; Deroy
  // Duarte 59' e Sidny Lopes Cabral 103' p/ CPV). Argentina classificada; alimenta a Oitavas
  // #95 (slot W86).
  86: { status: "FINISHED", score: { teamA: 3, teamB: 2 } },
  // #87 · 16-avos · Kansas City Stadium · 03/07/2026 — Colômbia 1×0 Gana (Jhon Arias 14').
  // Colômbia classificada; alimenta a Oitavas #96 (slot W87).
  87: { status: "FINISHED", score: { teamA: 1, teamB: 0 } },
  // #88 · 16-avos · Dallas Stadium · 03/07/2026 — Austrália 1×1 Egito (gol contra de Mohamed
  // Hany 55' p/ AUS; Emam Ashour 13' p/ EGY), Egito 4×2 nos pênaltis (Saber, Ramy Rabia,
  // Mohamed Salah e Hossam Abdelmaguid; Irvine e Awer Mabil p/ AUS). Egito classificado;
  // alimenta a Oitavas #95 (slot W88).
  88: { status: "FINISHED", score: { teamA: 1, teamB: 1 }, penaltyScore: { teamA: 2, teamB: 4 } },
  // #89 · Oitavas · Philadelphia Stadium · 04/07/2026 — Paraguai 0×1 França (Kylian Mbappé 70' p/ FRA).
  // França classificada às Quartas; alimenta a #97 (slot W89), duelo com o Marrocos.
  89: { status: "FINISHED", score: { teamA: 0, teamB: 1 } },
  // #90 · Oitavas · Houston Stadium · 04/07/2026 — Canadá 0×3 Marrocos (Azzedine Ounahi 50' e
  // 82', Soufiane Rahimi 90+8' p/ MAR). Marrocos classificado às Quartas; alimenta a #97 (slot W90).
  90: { status: "FINISHED", score: { teamA: 0, teamB: 3 } },
  // #91 · Oitavas · 04/07/2026 — Brasil 1×2 Noruega (Erling Haaland 79' e 90' p/ NOR; Neymar Jr
  // 90+10' p/ BRA). Noruega classificada às Quartas; alimenta a #99 (slot W91). Brasil eliminado.
  91: { status: "FINISHED", score: { teamA: 1, teamB: 2 } },
  // #92 · Oitavas · 05/07/2026 — México 2×3 Inglaterra (Jude Bellingham 36' e 38', Harry Kane 60'
  // p/ ING; Julian Quiñones 42' e Raúl Jiménez 69' p/ MEX; Jarell Quansah expulso aos 54' p/ ING).
  // Inglaterra classificada às Quartas mesmo com um a menos; alimenta a #99 (slot W92). México eliminado.
  92: { status: "FINISHED", score: { teamA: 2, teamB: 3 } },
  // #93 · Oitavas · Dallas Stadium · 06/07/2026 — Portugal 0×1 Espanha (Mikel Merino aos 90+1').
  // Espanha classificada às Quartas nos acréscimos; alimenta a #98 (slot W93). Portugal (Cristiano
  // Ronaldo) eliminado.
  93: { status: "FINISHED", score: { teamA: 0, teamB: 1 } },
  // #94 · Oitavas · Seattle Stadium · 06/07/2026 — Estados Unidos 1×4 Bélgica (Charles De Ketelaere
  // 1' e 33', Hans Vanaken 57', Romelu Lukaku 90+3' p/ BEL; Malik Tillman 31' p/ EUA). Bélgica
  // classificada às Quartas com autoridade; alimenta a #98 (slot W94). EUA eliminados.
  94: { status: "FINISHED", score: { teamA: 1, teamB: 4 } },
  // #95 · Oitavas · Atlanta Stadium · 07/07/2026 — Argentina 3×2 Egito (Yasser Ibrahim 15' e Mostafa
  // Zico 67' p/ EGY; Cristian Romero 79', Lionel Messi 83' e Enzo Fernández 90+2' p/ ARG; um egípcio
  // expulso aos 90+4'). Argentina virou de 0×2 e se classificou às Quartas; alimenta a #100 (slot
  // W95). Egito eliminado.
  95: { status: "FINISHED", score: { teamA: 3, teamB: 2 } },
  // #96 · Oitavas · BC Place Vancouver · 07/07/2026 — Suíça 0×0 Colômbia (após a prorrogação),
  // Suíça 4×3 nos pênaltis (Granit Xhaka, Zeki Amdouni, Cedric Itten e Ruben Vargas; Juan
  // Quintero, Jaminton Campaz e Luis Díaz p/ COL). Suíça classificada às Quartas; alimenta a
  // #100 (slot W96), duelo com a Argentina. Colômbia eliminada.
  96: { status: "FINISHED", score: { teamA: 0, teamB: 0 }, penaltyScore: { teamA: 4, teamB: 3 } },
  // #97 · Quartas · Boston Stadium · 09/07/2026 — França 2×0 Marrocos (Kylian Mbappé 60',
  // Ousmane Dembélé 66'). França classificada às Semifinais; alimenta a #101 (slot W97), duelo
  // com a Espanha. Marrocos eliminado.
  97: { status: "FINISHED", score: { teamA: 2, teamB: 0 } },
  // #98 · Quartas · Los Angeles Stadium · 10/07/2026 — Espanha 2×1 Bélgica (Fabián Ruiz 30' e
  // Mikel Merino 88' p/ ESP; Charles De Ketelaere 41' p/ BEL). Espanha classificada às
  // Semifinais; alimenta a #101 (slot W98). Bélgica eliminada.
  98: { status: "FINISHED", score: { teamA: 2, teamB: 1 } },
  // #99 · Quartas · Miami Stadium — Noruega 1×2 Inglaterra após a prorrogação (Andreas Schjelderup
  // 36' p/ NOR; Jude Bellingham 45+2' e 93' p/ ING). Inglaterra virou na prorrogação e se
  // classificou às Semifinais; alimenta a #102 (slot W99), duelo com a Argentina. Noruega eliminada.
  99: { status: "FINISHED", score: { teamA: 1, teamB: 2 } },
  // #100 · Quartas · Kansas City Stadium — Argentina 3×1 Suíça após a prorrogação (Alexis Mac
  // Allister 10', Julián Álvarez 112' e Lautaro Martínez 120+1' p/ ARG; Dan Ndoye 67' p/ SUI).
  // Argentina classificada às Semifinais; alimenta a #102 (slot W100). Suíça eliminada.
  100: { status: "FINISHED", score: { teamA: 3, teamB: 1 } },
  // #101 · Semifinal · Dallas Stadium · 14/07/2026 — França 0×2 Espanha (Mikel Oyarzabal 22',
  // Pedro Porro 58'). Espanha classificada à FINAL (#104, slot W101); França cai para a disputa
  // do 3º lugar (#103, slot L101/RU101). Rabiot, Cucurella e Mbappé amarelados.
  101: { status: "FINISHED", score: { teamA: 0, teamB: 2 } },
  // #102 · Semifinal · Atlanta Stadium · 15/07/2026 — Inglaterra 1×2 Argentina (Anthony Gordon
  // 55' p/ ING; Enzo Fernández 85' e Lautaro Martínez 90+2' p/ ARG). Argentina classificada à
  // FINAL (#104, slot W102); Inglaterra cai para a disputa do 3º lugar (#103, slot L102/RU102).
  // Anderson; Lisandro Martínez, Romero e De Paul amarelados.
  102: { status: "FINISHED", score: { teamA: 1, teamB: 2 } },
  // #103 · Disputa do 3º Lugar · Miami Stadium · 18/07/2026 — França 4×6 Inglaterra (Kylian
  // Mbappé 48' e 66', Bradley Barcola 54', Ousmane Dembélé 90+6' p/ FRA; Declan Rice 3', Ezri
  // Konsa 18', Bukayo Saka 37', 45+1' e 87' [hat-trick] e Jude Bellingham 90+8' p/ ING).
  // Inglaterra fica com o 3º lugar num jogo de dez gols; França em 4º.
  103: { status: "FINISHED", score: { teamA: 4, teamB: 6 } },
  // #104 · FINAL · New York/New Jersey Stadium · 19/07/2026 — Espanha 1×0 Argentina na
  // prorrogação (Ferran Torres 106'). 🏆 ESPANHA CAMPEÃ DA COPA DO MUNDO FIFA 2026; Argentina
  // vice-campeã.
  104: { status: "FINISHED", score: { teamA: 1, teamB: 0 } },
};
