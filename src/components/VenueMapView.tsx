import { useEffect, useMemo, useRef, useState } from "react";
import { divIcon, type DivIcon, type LatLngBoundsExpression } from "leaflet";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { stadiums } from "../data/tournament";
import { localizedStageName } from "../utils/knockoutSlots";
import type { Match, Stadium, TeamRef } from "../types";
import { getActiveLocale, localeToIntlTag, useT } from "../i18n";
import { FlagIcon } from "./FlagIcon";

interface VenueMapViewProps {
  matches: Match[];
  theme: "classic-light" | "stadium-dark";
  onSelectTeamLineup: (team: TeamRef) => void;
}

interface VenueWithMatches extends Stadium {
  hostedMatches: Match[];
}

const NORTH_AMERICA_BOUNDS: LatLngBoundsExpression = [
  [14.5, -127.5],
  [55.5, -62],
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function getVenueData(matches: Match[]): VenueWithMatches[] {
  return stadiums.map((stadium) => ({
    ...stadium,
    hostedMatches: matches
      .filter(
        (match) =>
          normalizeText(match.stadiumName) === normalizeText(stadium.name) &&
          normalizeText(match.city) === normalizeText(stadium.city),
      )
      .sort(
        (a, b) =>
          new Date(a.kickoffTimestamp).getTime() -
          new Date(b.kickoffTimestamp).getTime(),
      ),
  }));
}

function formatCapacity(capacity: number) {
  return new Intl.NumberFormat(localeToIntlTag(getActiveLocale())).format(capacity);
}

function createVenueMarkerIcon(
  country: Stadium["country"],
  selected: boolean,
  venueId: string,
): DivIcon {
  const countryClass = `venue-map-marker--${country.toLowerCase()}`;
  const selectedClass = selected ? "venue-map-marker--selected" : "";

  return divIcon({
    className: "venue-map-marker-shell",
    html: `<div class="venue-map-marker ${countryClass} ${selectedClass}" data-venue-id="${venueId}"><span class="venue-map-marker__core"></span></div>`,
    iconSize: selected ? [28, 40] : [22, 32],
    iconAnchor: selected ? [14, 40] : [11, 32],
  });
}

function FocusSelectedVenue({ venue }: { venue: VenueWithMatches }) {
  const map = useMap();
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    map.flyTo([venue.coordinates.lat, venue.coordinates.lng], 5, {
      animate: true,
      duration: 0.75,
    });
  }, [map, venue]);

  return null;
}

export function VenueMapView({ matches, theme, onSelectTeamLineup }: VenueMapViewProps) {
  const t = useT();
  const venues = useMemo(() => getVenueData(matches), [matches]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>(venues[0].id);

  const selectedVenue =
    venues.find((venue) => venue.id === selectedVenueId) ?? venues[0];

  const cardClasses =
    theme === "classic-light"
      ? "bg-white border-slate-200 shadow-sm"
      : "bg-[#121414] border-white/10";
  const softCardClasses =
    theme === "classic-light"
      ? "bg-slate-50 border-slate-200"
      : "bg-white/5 border-white/10";
  const headingClasses = theme === "classic-light" ? "text-slate-900" : "text-white";
  const mutedClasses = theme === "classic-light" ? "text-slate-600" : "text-slate-300";
  const subtleClasses = theme === "classic-light" ? "text-slate-500" : "text-slate-400";
  const selectedListClasses =
    theme === "classic-light"
      ? "border-[#009c3b] bg-[#009c3b]/6"
      : "border-[#00e476] bg-[#00e476]/10";
  const idleListClasses =
    theme === "classic-light"
      ? "border-slate-200 bg-white hover:border-slate-300"
      : "border-white/10 bg-[#161919] hover:border-white/20";
  const themeClass =
    theme === "classic-light" ? "venue-map-theme-light" : "venue-map-theme-dark";

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 2xl:max-w-[1600px]" id="venue-map-view">
      <h2
        className={`font-anton text-2xl md:text-3xl uppercase tracking-wider ${headingClasses}`}
        id="venue-map-title"
      >
        {t("venuesNews.venues.title")}
      </h2>
      <p className={`mt-1 mb-6 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
        {t("venuesNews.venues.subtitle")}
      </p>

      <div
        className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.8fr)] 2xl:grid-cols-[minmax(0,1.5fr)_minmax(380px,0.75fr)]"
        id="venue-layout-grid"
      >
        <section className={`rounded-3xl border p-4 md:p-5 ${cardClasses}`} id="venue-map-shell">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
                {t("venuesNews.venues.mapTitle")}
              </p>
              <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                {t("venuesNews.venues.mapHint")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2" id="venue-map-legend">
              {(["USA", "MEX", "CAN"] as const).map((country) => (
                <span
                  key={country}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                    theme === "classic-light"
                      ? "border-slate-200 bg-slate-50 text-slate-600"
                      : "border-white/10 bg-white/5 text-slate-200"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full venue-map-country-dot venue-map-country-dot--${country.toLowerCase()}`}
                  />
                  {t(`venuesNews.country.${country}`)}
                </span>
              ))}
            </div>
          </div>

          <div
            className={`venue-map-surface ${themeClass} mt-4 overflow-hidden rounded-[28px] border ${
              theme === "classic-light"
                ? "border-slate-200 bg-slate-50"
                : "border-white/10 bg-[#0d1011]"
            }`}
            id="venue-map-canvas"
          >
            <MapContainer
              bounds={NORTH_AMERICA_BOUNDS}
              boundsOptions={{ padding: [28, 28] }}
              minZoom={3}
              maxZoom={8}
              scrollWheelZoom
              zoomSnap={0.25}
              className="h-[320px] w-full sm:h-[360px] lg:h-[480px] 2xl:h-[560px]"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FocusSelectedVenue venue={selectedVenue} />

              {venues.map((venue) => {
                const selected = venue.id === selectedVenue.id;

                return (
                  <Marker
                    key={venue.id}
                    position={[venue.coordinates.lat, venue.coordinates.lng]}
                    icon={createVenueMarkerIcon(venue.country, selected, venue.id)}
                    keyboard
                    title={venue.name}
                    zIndexOffset={selected ? 1000 : 0}
                    eventHandlers={{
                      click: () => setSelectedVenueId(venue.id),
                    }}
                  >
                    <Tooltip
                      direction="top"
                      offset={[0, -18]}
                      opacity={1}
                      permanent={selected}
                    >
                      <span className="font-mono text-[10px] uppercase tracking-wider">
                        {venue.city}
                      </span>
                    </Tooltip>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          <p className={`mt-3 font-archivo text-sm leading-6 ${mutedClasses}`}>
            {t("venuesNews.venues.mapDescription")}
          </p>

          <div className="mt-4 md:hidden">
            <div
              className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1"
              id="venue-mobile-list"
            >
              {venues.map((venue) => {
                const selected = venue.id === selectedVenue.id;

                return (
                  <button
                    key={venue.id}
                    id={`venue-card-${venue.id}`}
                    type="button"
                    onClick={() => setSelectedVenueId(venue.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition min-h-11 ${
                      selected ? selectedListClasses : idleListClasses
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={`font-anton text-base uppercase tracking-wide ${headingClasses}`}>
                          {venue.name}
                        </p>
                        <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                          {venue.city} • {t(`venuesNews.country.${venue.country}`)}
                        </p>
                      </div>
                      <span className={`font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
                        {t("venuesNews.venues.matchCount", { count: venue.hostedMatches.length })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside
          className={`rounded-3xl border p-4 md:p-5 ${cardClasses}`}
          id="venue-detail-panel"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={`font-mono text-[10px] uppercase tracking-[0.22em] ${mutedClasses}`}>
                {t("venuesNews.venues.selectedVenue")}
              </p>
              <h3
                className={`mt-2 font-anton text-2xl uppercase tracking-wide ${headingClasses}`}
                id="venue-detail-title"
              >
                {selectedVenue.name}
              </h3>
              <p className={`mt-2 font-mono text-[11px] uppercase tracking-wider ${mutedClasses}`}>
                {selectedVenue.city} • {t(`venuesNews.country.${selectedVenue.country}`)}
              </p>
            </div>

            <span
              className={`inline-flex rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider ${
                theme === "classic-light"
                  ? "border-slate-200 bg-slate-50 text-slate-600"
                  : "border-white/10 bg-white/5 text-slate-200"
              }`}
            >
              {t("venuesNews.venues.highlightedMatches", { count: selectedVenue.hostedMatches.length })}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2" id="venue-detail-stats">
            <div className={`rounded-2xl border px-4 py-3 ${softCardClasses}`}>
              <p className={`font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
                {t("venuesNews.venues.capacity")}
              </p>
              <p className={`mt-2 font-anton text-2xl uppercase tracking-wide ${headingClasses}`}>
                {formatCapacity(selectedVenue.capacity)}
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 ${softCardClasses}`}>
              <p className={`font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
                {t("venuesNews.venues.inauguration")}
              </p>
              <p className={`mt-2 font-anton text-2xl uppercase tracking-wide ${headingClasses}`}>
                {selectedVenue.yearBuilt}
              </p>
            </div>
          </div>

          <div className={`mt-5 rounded-2xl border p-4 ${softCardClasses}`}>
            <p className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
              {t("venuesNews.venues.arenaXRay")}
            </p>
            <ul className="mt-3 flex flex-col gap-3" id="venue-facts-list">
              {selectedVenue.facts.map((fact, index) => (
                <li key={fact} className="flex items-start gap-3">
                  <span
                    className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                      theme === "classic-light" ? "bg-[#009c3b]" : "bg-[#00e476]"
                    }`}
                  />
                  <p className={`font-archivo text-sm leading-6 ${index === 0 ? headingClasses : mutedClasses}`}>
                    {fact}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className={`mt-5 rounded-2xl border p-4 ${softCardClasses}`} id="venue-hosted-matches">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
                  {t("venuesNews.venues.matchesHere")}
                </p>
                <p className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
                  {t("venuesNews.venues.matchesHereHint")}
                </p>
              </div>
            </div>

            {selectedVenue.hostedMatches.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3">
                {selectedVenue.hostedMatches.map((match) => (
                  <div
                    key={match.id}
                    id={`venue-hosted-match-${match.id}`}
                    className={`rounded-2xl border p-3 ${
                      theme === "classic-light"
                        ? "border-slate-200 bg-white"
                        : "border-white/10 bg-[#121414]"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <FlagIcon
                            flag={match.teamA.flagSvg}
                            className="h-4 w-6"
                            onClick={() => onSelectTeamLineup(match.teamA)}
                          />
                          <span className={`font-anton text-sm uppercase tracking-wide ${headingClasses}`}>
                            {match.teamA.code}
                          </span>
                        </div>
                        <span className={`font-mono text-[10px] uppercase tracking-wider ${subtleClasses}`}>
                          x
                        </span>
                        <div className="flex items-center gap-2">
                          <FlagIcon
                            flag={match.teamB.flagSvg}
                            className="h-4 w-6"
                            onClick={() => onSelectTeamLineup(match.teamB)}
                          />
                          <span className={`font-anton text-sm uppercase tracking-wide ${headingClasses}`}>
                            {match.teamB.code}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`self-start font-mono text-[10px] uppercase tracking-wider sm:self-auto ${mutedClasses}`}
                      >
                        {localizedStageName(match.stageName)}
                      </span>
                    </div>
                    <p className={`mt-2 font-archivo text-sm ${mutedClasses}`}>
                      {match.kickoffDate} • {match.kickoffTime}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={`mt-4 font-archivo text-sm leading-6 ${mutedClasses}`}>
                {t("venuesNews.venues.noMatches")}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
