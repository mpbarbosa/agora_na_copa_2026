// Pure domain logic for deciding whether an editorial analysis is "up to date".
//
// An analysis is considered up to date when it was authored at or after the
// reference event it should reflect — for a national team, that event is the
// kickoff of the team's most recent FINISHED match. If the team has not played
// yet there is nothing the analysis can be behind, so it counts as up to date.
// If the team has played but the analysis carries no timestamp, it is outdated.

/**
 * Returns true when an analysis stamped `analysisUpdatedAt` is current with the
 * reference event at `lastEventDate` (e.g. a team's last finished match).
 *
 * Both inputs are ISO-8601 strings. Unparseable or missing values are handled
 * conservatively: no reference event ⇒ up to date; reference event but no/invalid
 * stamp ⇒ outdated.
 */
export function isAnalysisUpToDate(
  analysisUpdatedAt: string | null | undefined,
  lastEventDate: string | null | undefined,
): boolean {
  const eventTime = lastEventDate ? new Date(lastEventDate).getTime() : NaN;
  // No (valid) reference event — nothing to be behind.
  if (Number.isNaN(eventTime)) return true;

  const stampTime = analysisUpdatedAt ? new Date(analysisUpdatedAt).getTime() : NaN;
  // There is a match to reflect but the analysis has no usable timestamp.
  if (Number.isNaN(stampTime)) return false;

  return stampTime >= eventTime;
}

/** The minimal match shape `lastFinishedKickoff` needs. */
export interface FinishableMatch {
  status: string;
  kickoffTimestamp: string;
}

/**
 * Returns the kickoff timestamp (ISO-8601) of the most recent FINISHED match in
 * `matches`, or null when none are finished. Callers pre-filter to the relevant
 * scope (a single team's fixtures, or one group's). Used as the reference event
 * for isAnalysisUpToDate on the group and player surfaces.
 */
export function lastFinishedKickoff(matches: readonly FinishableMatch[]): string | null {
  let latest: string | null = null;
  let latestTime = -Infinity;
  for (const m of matches) {
    if (m.status !== "FINISHED") continue;
    const t = new Date(m.kickoffTimestamp).getTime();
    if (Number.isNaN(t)) continue;
    if (t > latestTime) {
      latestTime = t;
      latest = m.kickoffTimestamp;
    }
  }
  return latest;
}
