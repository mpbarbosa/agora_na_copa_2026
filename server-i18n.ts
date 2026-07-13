// Server-side pt→es translations for the fixed resilience `note` strings and
// endpoint error messages of the FIFA-shell endpoints. Applied at the response
// boundary (`localizeResilienceNote` / `localizeNote`) so payloads are built in
// pt as before and translated on the way out for the `es` locale — no need to
// thread `locale` through every payload-building helper.
//
// Keys are the exact pt literal the code produces; an unmapped string passes
// through unchanged (graceful: worst case a note stays pt). Only the FIFA-shell
// endpoints the Spanish client actually calls are covered here; BR-centric feeds
// (Google Trends, Reddit) keep pt notes by design (their content is pt-first).

import type { Locale } from "./src/i18n/locale";

// Each pt literal maps to its es and en translations. An unmapped string (or an
// unmapped locale) passes through unchanged (graceful: worst case a note stays pt).
type NoteTranslation = { es: string; en: string };

const NOTE_TRANSLATIONS: Record<string, NoteTranslation> = {
  // Broadcast guide
  "Dados oficiais de Onde Assistir da FIFA.": {
    es: "Datos oficiales de «Dónde Ver» de la FIFA.",
    en: "Official FIFA 'Where to Watch' data.",
  },
  "Dados oficiais da FIFA indisponíveis para esta partida no momento; exibindo a lista local.": {
    es: "Datos oficiales de la FIFA no disponibles para este partido por ahora; mostrando la lista local.",
    en: "Official FIFA data unavailable for this match right now; showing the local list.",
  },
  "Nenhuma transmissão oficial da FIFA para esta partida no país selecionado.": {
    es: "No hay transmisión oficial de la FIFA para este partido en el país seleccionado.",
    en: "No official FIFA broadcast for this match in the selected country.",
  },
  // Team view
  "Painel da seleção abastecido por dados oficiais da FIFA sempre que disponíveis.": {
    es: "Panel de la selección alimentado con datos oficiales de la FIFA siempre que estén disponibles.",
    en: "Team panel powered by official FIFA data whenever available.",
  },
  "Painel da seleção usando dados locais do aplicativo enquanto a FIFA não publica todos os detalhes.": {
    es: "Panel de la selección usando datos locales de la app mientras la FIFA no publica todos los detalles.",
    en: "Team panel using the app's local data while FIFA hasn't published every detail.",
  },
  "Painel da seleção combinando dados oficiais da FIFA com fallback local do aplicativo.": {
    es: "Panel de la selección combinando datos oficiales de la FIFA con respaldo local de la app.",
    en: "Team panel combining official FIFA data with the app's local fallback.",
  },
  // Lineups
  "Escalação estimada a partir da base local do aplicativo.": {
    es: "Alineación estimada a partir de la base local de la app.",
    en: "Lineup estimated from the app's local data.",
  },
  // Player incidents
  "Incidentes a partir de dados locais (FIFA indisponível).": {
    es: "Incidencias a partir de datos locales (FIFA no disponible).",
    en: "Incidents from local data (FIFA unavailable).",
  },
  "Incidentes sincronizados com a FIFA.": {
    es: "Incidencias sincronizadas con la FIFA.",
    en: "Incidents synced with FIFA.",
  },
  // Tournament leaders
  "Ranking calculado a partir de placares e lances oficiais da FIFA.": {
    es: "Ranking calculado a partir de marcadores y jugadas oficiales de la FIFA.",
    en: "Ranking computed from official FIFA scores and plays.",
  },
  "Ranking calculado a partir do fallback local do aplicativo.": {
    es: "Ranking calculado a partir del respaldo local de la app.",
    en: "Ranking computed from the app's local fallback.",
  },
  "Ranking calculado com mix de dados oficiais da FIFA e fallback local.": {
    es: "Ranking calculado con una mezcla de datos oficiales de la FIFA y respaldo local.",
    en: "Ranking computed from a mix of official FIFA data and local fallback.",
  },
  // Player stats / incidents unavailable
  "Estatísticas indisponíveis — FIFA API inacessível.": {
    es: "Estadísticas no disponibles — API de la FIFA inaccesible.",
    en: "Stats unavailable — FIFA API unreachable.",
  },
  "Incidentes indisponíveis — FIFA API inacessível.": {
    es: "Incidencias no disponibles — API de la FIFA inaccesible.",
    en: "Incidents unavailable — FIFA API unreachable.",
  },
  // Country info (Wikipedia content stays pt for now; notes translated)
  "Dados da Wikipedia e Wikidata.": {
    es: "Datos de Wikipedia y Wikidata.",
    en: "Data from Wikipedia and Wikidata.",
  },
  "Usando dados em cache — Wikipedia inacessível.": {
    es: "Usando datos en caché — Wikipedia inaccesible.",
    en: "Using cached data — Wikipedia unreachable.",
  },
  "Informações indisponíveis — Wikipedia inacessível.": {
    es: "Información no disponible — Wikipedia inaccesible.",
    en: "Information unavailable — Wikipedia unreachable.",
  },

  // Endpoint error messages
  "Erro ao carregar guia de transmissão da FIFA": {
    es: "Error al cargar la guía de transmisión de la FIFA",
    en: "Error loading the FIFA broadcast guide",
  },
  "Erro ao carregar placares da FIFA": {
    es: "Error al cargar los marcadores de la FIFA",
    en: "Error loading FIFA scores",
  },
  "Erro ao carregar dados unificados da FIFA": {
    es: "Error al cargar los datos unificados de la FIFA",
    en: "Error loading unified FIFA data",
  },
  "Erro ao carregar escalações da FIFA": {
    es: "Error al cargar las alineaciones de la FIFA",
    en: "Error loading FIFA lineups",
  },
  "Erro ao carregar líderes do torneio": {
    es: "Error al cargar los líderes del torneo",
    en: "Error loading the tournament leaders",
  },
  "Erro ao carregar painel completo da seleção": {
    es: "Error al cargar el panel completo de la selección",
    en: "Error loading the full team panel",
  },
  "Jogador não encontrado nos líderes do torneio": {
    es: "Jugador no encontrado en los líderes del torneo",
    en: "Player not found in the tournament leaders",
  },
  "Jogador não encontrado": { es: "Jugador no encontrado", en: "Player not found" },
  "Seleção não encontrada": { es: "Selección no encontrada", en: "Team not found" },
  "País não encontrado": { es: "País no encontrado", en: "Country not found" },

  // Match weather (Open-Meteo)
  "Condições no estádio • Open-Meteo": {
    es: "Condiciones en el estadio • Open-Meteo",
    en: "Conditions at the stadium • Open-Meteo",
  },
  "Coordenadas do estádio inválidas.": {
    es: "Coordenadas del estadio inválidas.",
    en: "Invalid stadium coordinates.",
  },
  "Atualizando o clima…": {
    es: "Actualizando el clima…",
    en: "Updating the weather…",
  },
  "Clima indisponível no momento.": {
    es: "Clima no disponible por ahora.",
    en: "Weather unavailable right now.",
  },

  // Match predictor (/api/predict) validation errors
  "Informe as duas seleções (homeTeam e awayTeam).": {
    es: "Indica las dos selecciones (homeTeam y awayTeam).",
    en: "Provide both teams (homeTeam and awayTeam).",
  },
  "Escolha duas seleções diferentes.": {
    es: "Elige dos selecciones diferentes.",
    en: "Choose two different teams.",
  },
  "Seleção não encontrada.": {
    es: "Selección no encontrada.",
    en: "Team not found.",
  },

  // Live match chat (/api/chat)
  "Partida desconhecida.": { es: "Partido desconocido.", en: "Unknown match." },
  "Chat temporariamente indisponível. Tente em instantes.": {
    es: "Chat no disponible temporalmente. Prueba en unos instantes.",
    en: "Chat temporarily unavailable. Try again in a moment.",
  },
  "O chat abre quando a partida começa.": {
    es: "El chat se abre cuando comienza el partido.",
    en: "Chat opens when the match starts.",
  },
  "Você está enviando mensagens rápido demais. Respire.": {
    es: "Estás enviando mensajes demasiado rápido. Respira.",
    en: "You're sending messages too fast. Take a breather.",
  },
};

/** Translate one fixed pt string to the locale (unmapped → unchanged). */
export const localizeNote = (text: string, locale: Locale): string =>
  locale === "pt" ? text : NOTE_TRANSLATIONS[text]?.[locale] ?? text;

// SEO head strings for the served index.html, per non-default locale.
const HTML_SEO = {
  es: {
    htmlLang: "es-419",
    ogLocale: "es_MX",
    canonical: "https://es.copa2026.mpbarbosa.com/",
    title: "Ahora en el Mundial 26 — Copa Mundial FIFA 2026 en vivo",
    description:
      "Sigue la Copa Mundial de la FIFA 2026 en vivo: cuenta regresiva, dónde ver, alineaciones, tablas de posiciones de los grupos, clasificación y llave — todo en un solo lugar.",
    ogDescription:
      "Cuenta regresiva, dónde ver, alineaciones, tablas de posiciones y llave de la Copa Mundial de la FIFA 2026 — todo en un solo lugar.",
    ogSiteName: "Ahora en el Mundial 26",
    ogImageAlt: "Ahora en el Mundial 26 — compañero de la Copa Mundial FIFA 2026",
    sportsEventName: "Copa Mundial FIFA 2026",
  },
  en: {
    htmlLang: "en-US",
    ogLocale: "en_US",
    canonical: "https://en.copa2026.mpbarbosa.com/",
    title: "Now at the World Cup 26 — FIFA World Cup 2026 live",
    description:
      "Follow the FIFA World Cup 2026 live: countdown, where to watch, lineups, group standings, qualification and bracket — all in one place.",
    ogDescription:
      "Countdown, where to watch, lineups, standings and bracket for the FIFA World Cup 2026 — all in one place.",
    ogSiteName: "Now at the World Cup 26",
    ogImageAlt: "Now at the World Cup 26 — FIFA World Cup 2026 companion",
    sportsEventName: "FIFA World Cup 2026",
  },
} as const;

/**
 * Localize the served index.html for the request locale. pt is the file's native
 * language, so pt returns it unchanged; es rewrites `<html lang>`, `<title>`, the
 * description/OG/canonical head tags, and injects `window.__AGORA_LOCALE__` so the
 * SPA boots in Spanish before its own hostname check runs. Robust to content via
 * targeted regex on the head tags (the file is author-controlled).
 */
export const localizeIndexHtml = (html: string, locale: Locale): string => {
  if (locale === "pt") return html;
  const seo = HTML_SEO[locale];
  return html
    .replace(/(<html[^>]*\blang=")[^"]*(")/, `$1${seo.htmlLang}$2`)
    .replace(/<title>[^<]*<\/title>/, `<title>${seo.title}</title>`)
    .replace(
      /(<meta\s+name="description"\s+content=")[^"]*(")/,
      `$1${seo.description}$2`,
    )
    .replace(
      /(<meta\s+property="og:locale"\s+content=")[^"]*(")/,
      `$1${seo.ogLocale}$2`,
    )
    .replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
      `$1${seo.title}$2`,
    )
    .replace(
      /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
      `$1${seo.ogDescription}$2`,
    )
    .replace(
      /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
      `$1${seo.title}$2`,
    )
    .replace(
      /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,
      `$1${seo.ogDescription}$2`,
    )
    .replace(
      /(<meta\s+property="og:site_name"\s+content=")[^"]*(")/,
      `$1${seo.ogSiteName}$2`,
    )
    .replace(
      /(<meta\s+property="og:image:alt"\s+content=")[^"]*(")/,
      `$1${seo.ogImageAlt}$2`,
    )
    .replace(
      /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
      `$1${seo.canonical}$2`,
    )
    .replace(
      /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
      `$1${seo.canonical}$2`,
    )
    // JSON-LD (schema.org) locale swaps: the page language, the WebSite/Organization
    // brand name (both occurrences), and the tournament's localized name.
    .replace(/"inLanguage": "pt-BR"/, `"inLanguage": "${seo.htmlLang}"`)
    .replace(/"name": "Agora na Copa 26"/g, `"name": "${seo.ogSiteName}"`)
    .replace(/"name": "Copa do Mundo FIFA 2026"/, `"name": "${seo.sportsEventName}"`)
    .replace("</head>", `  <script>window.__AGORA_LOCALE__="${locale}";</script>\n  </head>`);
};

/**
 * Return a copy of a resilience payload with its top-level `note` translated to
 * the locale. No-op for pt or when there is no string note.
 */
export const localizeResilienceNote = <T extends { note?: string }>(
  payload: T,
  locale: Locale,
): T =>
  locale !== "pt" && typeof payload.note === "string"
    ? { ...payload, note: localizeNote(payload.note, locale) }
    : payload;
