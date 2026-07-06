import { useMemo, useState } from "react";
import type { Match } from "../types";
import { FlagIcon } from "./FlagIcon";
import { useClockTick } from "../hooks/useClockTick";
import { buildGroupPositionMap } from "../standings";
import { useT } from "../i18n";
import {
  buildTeamMetaMap,
  findTeamFocus,
  formatCountdown,
  hexToRgba,
  listSelectableTeams,
} from "../utils/teamCountdown";

// Neutral fallback colours (Brazil green/yellow) used before a team is chosen, or if a
// team's colours are missing from the fixture data.
const FALLBACK_PRIMARY = "#009c3b";
const FALLBACK_SECONDARY = "#ffdf00";
// Live status green is a semantic colour (match state), not a team colour — kept constant.
const LIVE_GREEN = "#00e476";

interface TeamCountdownBadgeProps {
  matches: Match[];
  // The FIFA code of the team the supporter follows, or null when none is chosen yet
  // (the es/LATAM default) — in which case the badge invites them to pick one.
  favoriteTeam: string | null;
  onSelectTeam: (code: string) => void;
}

// A fixed bottom-right badge that counts down to the followed national team's next match.
// Any supporter can point it at their own team — the picker lists every team still alive
// (i.e. with a live/upcoming fixture). Colours, flag and copy all follow the chosen team.
export function TeamCountdownBadge({
  matches,
  favoriteTeam,
  onSelectTeam,
}: TeamCountdownBadgeProps) {
  const [dismissed, setDismissed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const t = useT();
  const now = useClockTick();

  const groupPositions = useMemo(
    () => buildGroupPositionMap(matches),
    [matches],
  );
  const teamMeta = useMemo(() => buildTeamMetaMap(matches), [matches]);
  const selectable = useMemo(
    () => listSelectableTeams(matches, groupPositions),
    [matches, groupPositions],
  );
  const focus = useMemo(
    () =>
      favoriteTeam
        ? findTeamFocus(matches, groupPositions, favoriteTeam)
        : null,
    [matches, groupPositions, favoriteTeam],
  );

  if (dismissed) return null;
  // Nothing left to follow (tournament over / no live or upcoming fixtures) — stay hidden.
  if (selectable.length === 0) return null;

  // Only show the followed team while it's still alive (has a live/upcoming fixture, i.e. it
  // appears in the selectable list). A team knocked out of the tournament — e.g. Brazil after
  // a Round-of-16 loss — must NOT surface in the banner; it falls back to the "choose a
  // seleção" invite so an eliminated side is never presented as the team being tracked.
  const favoriteAlive =
    !!favoriteTeam && selectable.some((team) => team.code === favoriteTeam);
  const meta = favoriteAlive && favoriteTeam ? teamMeta.get(favoriteTeam) : undefined;
  const primary = meta?.primaryColor || FALLBACK_PRIMARY;
  const secondary = meta?.secondaryColor || FALLBACK_SECONDARY;

  const isLive = focus?.match.status === "LIVE";
  const secsRemaining = focus
    ? Math.max(
        0,
        Math.floor(
          (new Date(focus.match.kickoffTimestamp).getTime() - now.getTime()) /
            1000,
        ),
      )
    : 0;

  // Show the team picker whenever there's no team yet, no upcoming match, or the user
  // explicitly opened it via "Trocar seleção".
  const showPicker = pickerOpen || !favoriteAlive || !focus;

  return (
    <div
      id="team-countdown-badge"
      data-testid="team-countdown-badge"
      className="fixed bottom-4 right-4 z-40 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#050505]/90 backdrop-blur-xl"
      style={{
        boxShadow: `0 0 28px ${hexToRgba(primary, 0.22)}, 0 8px 32px rgba(0,0,0,0.7)`,
      }}
    >
      {/* Team-colour top stripe */}
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${primary}, ${secondary}, ${primary})`,
        }}
      />

      {/* Header: team-colour gradient with a centred waving flag emblem (or a neutral
          prompt when no team is chosen yet) + close button */}
      <div
        className="relative flex h-20 w-full items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(primary, 0.85)}, ${hexToRgba(secondary, 0.55)})`,
        }}
      >
        {meta ? (
          <FlagIcon
            flag={meta.flagSvg}
            className="flag-wave h-11 w-16 rounded-[3px] shadow-lg ring-1 ring-black/25"
          />
        ) : (
          <span className="px-3 text-center font-anton text-xs uppercase leading-tight tracking-wide text-white/90">
            {t("banners.teamCountdown.choose")}
          </span>
        )}
        <button
          type="button"
          id="btn-close-team-badge"
          onClick={() => setDismissed(true)}
          aria-label={t("banners.teamCountdown.closeAria")}
          className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 leading-none text-white/60 transition hover:bg-black/90 hover:text-white"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          >
            <line x1="1" y1="1" x2="7" y2="7" />
            <line x1="7" y1="1" x2="1" y2="7" />
          </svg>
        </button>
      </div>

      {/* Info section */}
      <div className="px-3 pb-3 pt-2.5">
        {focus && meta ? (
          <>
            {/* Status label */}
            {isLive ? (
              <div className="mb-2 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ backgroundColor: LIVE_GREEN }}
                  />
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ backgroundColor: LIVE_GREEN }}
                  />
                </span>
                <span
                  className="font-mono text-[8px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: LIVE_GREEN }}
                >
                  {t("banners.teamCountdown.live", { team: meta.name })}
                </span>
              </div>
            ) : (
              <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.18em] text-white/40">
                {t("banners.teamCountdown.next")}
              </p>
            )}

            {/* Opponent */}
            <div className="flex items-center gap-2">
              <FlagIcon
                flag={focus.opponent.flagSvg}
                className="h-4 w-6 shrink-0 rounded-[2px]"
              />
              <span className="font-anton text-sm uppercase leading-tight tracking-wide text-white">
                {focus.opponent.name}
              </span>
            </div>

            {/* Date · time */}
            <p className="mt-1 font-mono text-[9px] tracking-wide text-white/35">
              {focus.match.kickoffDate} · {focus.match.kickoffTime}
            </p>

            {/* Confronto não confirmado: a seleção e/ou o adversário ainda dependem da
                classificação — sinalizamos para não afirmar um cruzamento incerto. */}
            {!isLive && focus.provisional && (
              <p
                className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em]"
                style={{ color: hexToRgba(secondary, 0.85) }}
              >
                {t("banners.teamCountdown.probable")}
              </p>
            )}

            {/* Countdown or live indicator */}
            {isLive ? (
              <div
                className="mt-2 rounded-lg border py-2 text-center"
                style={{
                  borderColor: hexToRgba(LIVE_GREEN, 0.2),
                  backgroundColor: hexToRgba(LIVE_GREEN, 0.08),
                }}
              >
                <span
                  className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: LIVE_GREEN }}
                >
                  {t("banners.teamCountdown.onPitch")}
                </span>
              </div>
            ) : (
              <div
                className="mt-2 rounded-lg border py-2 text-center"
                style={{
                  borderColor: hexToRgba(secondary, 0.25),
                  backgroundColor: hexToRgba(secondary, 0.08),
                }}
                aria-live="polite"
              >
                <span
                  id="team-countdown-timer"
                  className="font-mono text-sm font-bold tracking-wider"
                  style={{ color: secondary }}
                  aria-label={t("banners.teamCountdown.countdownAria", {
                    time: formatCountdown(secsRemaining),
                  })}
                >
                  {formatCountdown(secsRemaining)}
                </span>
              </div>
            )}
          </>
        ) : (
          // No focus: an alive team awaiting its next fixture shows "sem próximo jogo"; a
          // team that's out (or none chosen) shows the neutral "choose a seleção" invite.
          <div>
            <p className="font-anton text-sm uppercase leading-tight tracking-wide text-white">
              {favoriteAlive
                ? t("banners.teamCountdown.noNextMatch")
                : t("banners.teamCountdown.choose")}
            </p>
            <p className="mt-1 font-archivo text-[11px] leading-snug text-white/45">
              {favoriteAlive
                ? t("banners.teamCountdown.noNextMatchHint")
                : t("banners.teamCountdown.chooseHint")}
            </p>
          </div>
        )}

        {/* Team picker */}
        {showPicker ? (
          <select
            id="select-favorite-team"
            value={favoriteTeam ?? ""}
            onChange={(event) => {
              const code = event.target.value;
              if (!code) return;
              onSelectTeam(code);
              setPickerOpen(false);
            }}
            aria-label={t("banners.teamCountdown.selectAria")}
            className="mt-2 min-h-9 w-full rounded-lg border border-white/15 bg-[#161919] px-2 py-1.5 font-archivo text-xs text-slate-100"
          >
            <option value="" disabled>
              {t("banners.teamCountdown.choose")}
            </option>
            {selectable.map((team) => (
              <option key={team.code} value={team.code}>
                {team.name}
              </option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            id="btn-change-favorite-team"
            onClick={() => setPickerOpen(true)}
            className="mt-2 w-full rounded-lg border border-white/10 py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-white/45 transition hover:border-white/25 hover:text-white/75"
          >
            {t("banners.teamCountdown.change")}
          </button>
        )}
      </div>
    </div>
  );
}
