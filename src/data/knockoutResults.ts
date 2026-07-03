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
};
