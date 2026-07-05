// UI string catalog — composed from per-area modules under ./catalogs so that
// contributions from different views never collide. Portuguese (pt) is the
// complete reference; Spanish (es) may omit keys — `translate` falls back to pt,
// then to the raw key, so a missing translation degrades gracefully.
//
// To add strings for a view: create ./catalogs/<name>.ts exporting a
// `CatalogModule` with keys prefixed `<name>.`, then register it in MODULES.

import type { Locale } from "./locale";
import type { CatalogModule } from "./catalogs/types";
import { coreCatalog } from "./catalogs/core";
import { aoVivoCatalog } from "./catalogs/aoVivo";
import { standingsCatalog } from "./catalogs/standings";
import { teamsCatalog } from "./catalogs/teams";
import { partidasCatalog } from "./catalogs/partidas";
import { commonCatalog } from "./catalogs/common";
import { jogadoresCatalog } from "./catalogs/jogadores";
import { lideresCatalog } from "./catalogs/lideres";
import { bracketCatalog } from "./catalogs/bracket";
import { playerCardCatalog } from "./catalogs/playerCard";
import { venuesNewsCatalog } from "./catalogs/venuesNews";
import { fanSocialCatalog } from "./catalogs/fanSocial";
import { teamLineupCatalog } from "./catalogs/teamLineup";
import { dashboardCatalog } from "./catalogs/dashboard";
import { liveExtrasCatalog } from "./catalogs/liveExtras";
import { bannersCatalog } from "./catalogs/banners";
import { toursCatalog } from "./catalogs/tours";
import { utilsCatalog } from "./catalogs/utils";

export type StringCatalog = Record<string, string>;

// Every catalog module, merged in order. Later modules win on key collision, but
// keys are namespaced per module so collisions shouldn't happen.
const MODULES: CatalogModule[] = [
  coreCatalog,
  aoVivoCatalog,
  standingsCatalog,
  teamsCatalog,
  partidasCatalog,
  commonCatalog,
  jogadoresCatalog,
  lideresCatalog,
  bracketCatalog,
  playerCardCatalog,
  venuesNewsCatalog,
  fanSocialCatalog,
  teamLineupCatalog,
  dashboardCatalog,
  liveExtrasCatalog,
  bannersCatalog,
  toursCatalog,
  utilsCatalog,
];

const mergeLocale = (pick: keyof CatalogModule): StringCatalog =>
  Object.assign({}, ...MODULES.map((module) => module[pick] ?? {}));

export const CATALOGS: Record<Locale, StringCatalog> = {
  pt: mergeLocale("pt"),
  es: mergeLocale("es"),
  en: mergeLocale("en"),
};

/**
 * Look up a key for a locale, falling back to pt, then to the raw key.
 * `params` interpolates `{name}`-style placeholders.
 */
export const translate = (
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string => {
  const template = CATALOGS[locale]?.[key] ?? CATALOGS.pt[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
};
