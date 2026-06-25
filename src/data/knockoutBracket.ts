import bracketData from "./knockoutBracket.json";
import type { KnockoutMatch } from "../types";

/**
 * The official FIFA knockout fixtures (R32 → 3rd-place play-off → Final), the single
 * trusted source for `BracketView`. Generated reproducibly into `knockoutBracket.json`
 * by `scripts/build-knockout-bracket.py` from the FIFA calendar API — never hand-edit
 * the pairings here; regenerate the JSON instead.
 */
export const KNOCKOUT_MATCHES = (bracketData as { matches: KnockoutMatch[] }).matches;
