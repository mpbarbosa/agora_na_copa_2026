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
 * Penalty shoot-outs are not modelled: a tie decided on penalties must NOT be seeded as a
 * draw, since the app deliberately never invents who advanced (see `finishedSideResult`
 * / `knockoutWinnerSlot`). Seed only ties with a decisive scoreline.
 */
export interface KnockoutResultSeed {
  status: "LIVE" | "FINISHED";
  score: { teamA: number; teamB: number };
  /** Optional FIFA period/clock label for a LIVE tie (e.g. "2º tempo", "44'"). */
  matchTime?: string;
}

export const KNOCKOUT_RESULTS: Record<number, KnockoutResultSeed> = {
  // #73 · 16-avos · Los Angeles Stadium · 28/06/2026 — África do Sul 0×1 Canadá
  // (Stephen Eustáquio aos 90+2'). Canadá classificado; alimenta a Oitavas #90 (slot W73).
  73: { status: "FINISHED", score: { teamA: 0, teamB: 1 } },
  // #76 · 16-avos · 29/06/2026 — Brasil 2×1 Japão (Sano 29' p/ JPN; Casemiro 56' e
  // Gabriel Martinelli 90+5' p/ BRA). Brasil classificado; alimenta a Oitavas #91 (slot W76).
  76: { status: "FINISHED", score: { teamA: 2, teamB: 1 } },
};
