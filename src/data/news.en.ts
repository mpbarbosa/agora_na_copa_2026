// English (US) overlays for the static news articles, keyed by article id. Only
// the human-readable fields are translated (title / summary / content / date);
// `category` stays the pt enum (it's a stable key mapped to a localized label in
// NewsView) and `id` / `imageUrl` are shared. `localizeNews` overlays these onto
// the pt articles for the en locale, falling back to pt for any untranslated
// field — pt/es render the originals unchanged.
import type { NewsArticle } from "../types";
import type { Locale } from "../i18n/locale";

type NewsOverlay = Pick<NewsArticle, "title" | "summary" | "content" | "date">;

export const NEWS_EN: Record<string, NewsOverlay> = {
  "sedes-atlanta-operacao": {
    "title": "Atlanta fine-tunes mobility operation for doubleheader dates",
    "summary": "The Georgia host city has beefed up transportation, signage, and boarding zones for days with heavier fan traffic.",
    "content": "The local organizing committee is working with extra metro service windows, bus corridors, and dedicated routes for arrival at the stadium. The goal is to cut the time between exiting the stations and reaching the gates during peak hours.",
    "date": "June 14, 2026"
  },
  "ingressos-lotes-familia": {
    "title": "Family tickets get a new release for the Group Stage",
    "summary": "The official platform opened an additional release for sections geared toward groups and families at the most in-demand matches.",
    "content": "The new tickets prioritize grouped seats and entrances closer to the hospitality areas. The recommendation is to complete your registration in advance to speed up the purchase when new windows open.",
    "date": "June 13, 2026"
  },
  "equipes-brasil-variacoes": {
    "title": "Brazil tests wing variations ahead of the next round",
    "summary": "The coaching staff is evaluating width adjustments down the flanks to take on more compact blocks as the competition continues.",
    "content": "In closed sessions, the team alternated short runs off the ball with pulled-back crosses to create an overload at the top of the box. The aim is to increase the volume of shots without losing balance in the defensive transition.",
    "date": "June 14, 2026"
  },
  "geral-audiencia-streaming": {
    "title": "Digital audience grows with second-screen viewing during matches",
    "summary": "Simultaneous consumption across the live broadcast, stats, and social media has become the norm among fans this edition.",
    "content": "The behavior underscores the demand for fast, visual, real-time context-driven experiences. Complementary tracking tools such as maps, tables, and broadcast guides are gaining weight in how fans navigate between matches.",
    "date": "June 12, 2026"
  },
  "sedes-vancouver-clima": {
    "title": "Vancouver prepares weather plan for night matches",
    "summary": "The Canadian host city has set up extra protocols for wind, rain, and entry flow at matches with lower temperatures.",
    "content": "The operation calls for handing out lightweight blankets in specific areas, reinforcing covered lines, and providing real-time updates on the gates with the shortest waits. The goal is to keep the experience comfortable even in variable-weather scenarios.",
    "date": "June 15, 2026"
  },
  "equipes-franca-rotacao": {
    "title": "France considers controlled rotation without losing aggressiveness",
    "summary": "The staff is weighing how to manage minutes over congested stretches of the calendar while preserving the high press on the front line.",
    "content": "The idea is to keep the attacking identity with selective changes in midfield and the back line. The internal read is that the intensity needs to stay high, but with a smarter distribution of workload between starters and impact players.",
    "date": "June 15, 2026"
  },
  "ingressos-checkin-digital": {
    "title": "Digital check-in becomes a central step for line-free entry",
    "summary": "Fans are now receiving more frequent reminders to validate their ticket, ID, and gate before heading out.",
    "content": "The official recommendation is to finish the check while still at the hotel or at home, avoiding bottlenecks at the arena entrances. The early flow also helps reduce section errors and improves distribution across the side entrances.",
    "date": "June 15, 2026"
  }
};

/** Return the articles localized for the active locale (en overlays; else pt). */
export const localizeNews = (
  articles: NewsArticle[],
  locale: Locale,
): NewsArticle[] =>
  locale === "en"
    ? articles.map((article) => ({ ...article, ...(NEWS_EN[article.id] ?? {}) }))
    : articles;
