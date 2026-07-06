import assert from "node:assert/strict";
import test from "node:test";

import { APP_MATCHES } from "../src/appMatches";
import { buildFeederTeamBySlot } from "../src/utils/knockoutFeeders";

// Regression: a later-round feeder slot (e.g. QF #97's "W89") must resolve to the R16
// winner even though R16 #89's own sides are the deeper feeder refs "W74"/"W77" — the
// bracket skeleton only names R32 group-draw sides, so the winning team has to be chased
// down the chain. Before the fix these slots were left as an unresolved "Vencedor #NN".
test("buildFeederTeamBySlot resolves QF slots through the R16 feeder chain", () => {
  const feeder = buildFeederTeamBySlot(APP_MATCHES);
  assert.equal(feeder.get("W89")?.code, "FRA"); // #89 Paraguai 0×1 França
  assert.equal(feeder.get("W90")?.code, "MAR"); // #90 Canadá 0×3 Marrocos
  assert.equal(feeder.get("W91")?.code, "NOR"); // #91 Brasil 1×2 Noruega
  // A slot with no matching feeder tie stays unresolved (never guesses a team).
  assert.equal(feeder.get("W999"), undefined);
});
