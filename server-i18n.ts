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

const NOTE_TRANSLATIONS: Record<string, string> = {
  // Broadcast guide
  "Dados oficiais de Onde Assistir da FIFA.":
    "Datos oficiales de «Dónde Ver» de la FIFA.",
  "Dados oficiais da FIFA indisponíveis para esta partida no momento; exibindo a lista local.":
    "Datos oficiales de la FIFA no disponibles para este partido por ahora; mostrando la lista local.",
  "Nenhuma transmissão oficial da FIFA para esta partida no país selecionado.":
    "No hay transmisión oficial de la FIFA para este partido en el país seleccionado.",
  // Team view
  "Painel da seleção abastecido por dados oficiais da FIFA sempre que disponíveis.":
    "Panel de la selección alimentado con datos oficiales de la FIFA siempre que estén disponibles.",
  "Painel da seleção usando dados locais do aplicativo enquanto a FIFA não publica todos os detalhes.":
    "Panel de la selección usando datos locales de la app mientras la FIFA no publica todos los detalles.",
  "Painel da seleção combinando dados oficiais da FIFA com fallback local do aplicativo.":
    "Panel de la selección combinando datos oficiales de la FIFA con respaldo local de la app.",
  // Lineups
  "Escalação estimada a partir da base local do aplicativo.":
    "Alineación estimada a partir de la base local de la app.",
  // Player incidents
  "Incidentes a partir de dados locais (FIFA indisponível).":
    "Incidencias a partir de datos locales (FIFA no disponible).",
  "Incidentes sincronizados com a FIFA.": "Incidencias sincronizadas con la FIFA.",
  // Tournament leaders
  "Ranking calculado a partir de placares e lances oficiais da FIFA.":
    "Ranking calculado a partir de marcadores y jugadas oficiales de la FIFA.",
  "Ranking calculado a partir do fallback local do aplicativo.":
    "Ranking calculado a partir del respaldo local de la app.",
  "Ranking calculado com mix de dados oficiais da FIFA e fallback local.":
    "Ranking calculado con una mezcla de datos oficiales de la FIFA y respaldo local.",
  // Player stats / incidents unavailable
  "Estatísticas indisponíveis — FIFA API inacessível.":
    "Estadísticas no disponibles — API de la FIFA inaccesible.",
  "Incidentes indisponíveis — FIFA API inacessível.":
    "Incidencias no disponibles — API de la FIFA inaccesible.",
  // Country info (Wikipedia content stays pt for now; notes translated)
  "Dados da Wikipedia e Wikidata.": "Datos de Wikipedia y Wikidata.",
  "Usando dados em cache — Wikipedia inacessível.":
    "Usando datos en caché — Wikipedia inaccesible.",
  "Informações indisponíveis — Wikipedia inacessível.":
    "Información no disponible — Wikipedia inaccesible.",

  // Endpoint error messages
  "Erro ao carregar guia de transmissão da FIFA":
    "Error al cargar la guía de transmisión de la FIFA",
  "Erro ao carregar placares da FIFA": "Error al cargar los marcadores de la FIFA",
  "Erro ao carregar dados unificados da FIFA":
    "Error al cargar los datos unificados de la FIFA",
  "Erro ao carregar escalações da FIFA": "Error al cargar las alineaciones de la FIFA",
  "Erro ao carregar líderes do torneio": "Error al cargar los líderes del torneo",
  "Erro ao carregar painel completo da seleção":
    "Error al cargar el panel completo de la selección",
  "Jogador não encontrado nos líderes do torneio":
    "Jugador no encontrado en los líderes del torneo",
  "Jogador não encontrado": "Jugador no encontrado",
  "Seleção não encontrada": "Selección no encontrada",
  "País não encontrado": "País no encontrado",
};

/** Translate one fixed pt string to the locale (unmapped → unchanged). */
export const localizeNote = (text: string, locale: Locale): string =>
  locale === "es" ? (NOTE_TRANSLATIONS[text] ?? text) : text;

// SEO head strings for the served index.html, per locale.
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
  if (locale !== "es") return html;
  const seo = HTML_SEO.es;
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
    .replace("</head>", `  <script>window.__AGORA_LOCALE__="es";</script>\n  </head>`);
};

/**
 * Return a copy of a resilience payload with its top-level `note` translated to
 * the locale. No-op for pt or when there is no string note.
 */
export const localizeResilienceNote = <T extends { note?: string }>(
  payload: T,
  locale: Locale,
): T =>
  locale === "es" && typeof payload.note === "string"
    ? { ...payload, note: localizeNote(payload.note, locale) }
    : payload;
