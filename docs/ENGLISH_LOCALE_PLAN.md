# English (US) Locale — Phased Implementation Plan

Adds a third locale, **`en`** (US English, "soccer" voice), alongside `pt` (default)
and `es` (LATAM). Served from **`en.copa2026.mpbarbosa.com`** by Host header, exactly
like the Spanish shell (see `docs/SPANISH_LOCALE_DEPLOY_RUNBOOK.md`).

Two decisions are already locked:

- **Voice / formatting:** US English, **"soccer"** terminology, `en-US` Intl tag,
  American date order (`July 4, 2026`), `og:locale = en_US`, default broadcast
  country **US**.
- **Editorial content:** **fully translated**, not hidden (unlike `es`, which hides
  it). This makes Phase 3 a major phase, not a one-liner.

## Architecture recap (what makes this tractable)

- **`Locale` is a union** `"pt" | "es"` in `src/i18n/locale.ts`. Widening it to add
  `"en"` is the spine of the whole effort — TypeScript then forces every locale
  branch to account for `en`.
- **`translate()` falls back `en → pt → key`** (`src/i18n/strings.ts`). English can
  therefore be built catalog-by-catalog in dev. **But** an untranslated key renders
  **Portuguese**, not English — so the public launch must be complete, and all dev
  happens behind the un-launched subdomain, gated by a parity test.
- **FIFA data is free in English:** the API accepts `?language=en`, and the existing
  `apiUrl()` already appends it for non-default locales. Team names, broadcasters,
  lineups, and FIFA-sourced notes arrive in English with no extra work.
- **Scale:** 18 catalog modules, ~860 keys per locale, plus the helper maps
  (`teamNames`, `matchStatus`, date month/weekday arrays, `broadcastCountries`),
  `server-i18n.ts`, and the editorial data files.

---

## Phase 1 — Locale spine (½ day)

Widen the type and thread `en` through every core mapping. TypeScript surfaces the
full blast radius once `Locale` gains `"en"`.

**`src/i18n/locale.ts`**
- `Locale = "pt" | "es" | "en"`; add to `SUPPORTED_LOCALES`, `isLocale`.
- `localeToIntlTag`: `en → "en-US"`.
- `localeToFifaLanguage`: `en → "en"`.
- `localeFromFifaLanguage`: map `"en"` → `en`.
- `localeToHtmlLang`: `en → "en"` (or `"en-US"`).
- `localeToOgLocale`: `en → "en_US"`.
- `localeFromHost`: match an `en.` prefix (currently only `es.`).

**`src/i18n/catalogs/types.ts`**
- `CatalogModule` gains `en?: Record<string, string>` (**optional** → modules can add
  `en` incrementally without breaking the build).

**`src/i18n/strings.ts`**
- `mergeLocale` must tolerate a missing `en` block: `...MODULES.map(m => m.en ?? {})`.
- Add `en: mergeLocale("en")` to `CATALOGS`.

**`src/data/broadcastCountries.ts`**
- `DEFAULT_COUNTRY_BY_LOCALE.en = "US"`.

**`src/App.tsx`** — the language switcher is a **binary `pt ⇄ es` toggle** today
(`setLocale(locale === "pt" ? "es" : "pt")`). Replace it with a **3-way picker**
(dropdown: Português / Español / English) — the one genuinely new UI element.

**Tests:** extend the locale unit tests (`localeFromHost("en.…")`, Intl tag, FIFA
language round-trip).

---

## Phase 2 — UI string translation (largest: 2–4 days)

Add an `en` block to each of the **18 catalog modules** (~860 keys) in US soccer
broadcast voice. Then the helper maps that live outside the catalogs:

- `EN_TEAM_NAMES` in `src/i18n/teamNames.ts` (English country names — most match, but
  e.g. `ALEMANHA → Germany`, `PAÍSES BAJOS → Netherlands`).
- `EN_OFFICIAL_STATUS` in `src/i18n/matchStatus.ts` (`1º tempo → 1st Half`,
  `Intervalo → Halftime`, `Pênaltis → Penalties`, …).
- `EN_MONTHS` / `EN_WEEKDAYS` in `src/appMatches.ts`, **and** switch the `en` date
  format to American month-first (`July 4, 2026`) — a small format branch, since the
  current template is day-first.
- `name.en` for the 20 entries in `src/data/broadcastCountries.ts`.

**Server boundary (`server-i18n.ts` + `server.ts`)**
- `HTML_SEO.en` block (title, description, canonical `https://en.copa2026…`, OG tags).
- `NOTE_TRANSLATIONS` currently maps only pt→es; restructure to per-locale (pt→en for
  every FIFA resilience note + endpoint error string).
- The **8 inline `locale === "es"` branches** in `server.ts` (weather/chat/error
  copy) need an `en` arm — refactor them to route through `server-i18n` rather than
  growing inline ternaries.

**Parity gate (do this early):** add a unit test asserting `en` (and `es`) contain
every `pt` key. This is the guard against the exact "raw-key / Portuguese-leak" class
of bug the Spanish rollout hit — a missing key silently renders pt, which tsc cannot
catch.

---

## Phase 3 — Editorial content, translated (major; separate track)

Unlike `es` (which hides editorial), `en` translates it. Affected data:

| File | Content |
|---|---|
| `src/data/teamAnalysis.json` | per-team "Análise da seleção" (`{text, updatedAt}`) |
| `src/data/matchAnalysis.json` | per-match "Destaques da partida" (string) |
| `src/data/groupAnalysis.json` | per-group analysis (`{text, updatedAt}`) |
| `src/data/coachNotes.json` | per-coach "Leitura do treinador" |
| `src/data/squads.json` | per-player `worldCupNote` (star notes) |
| `src/data/news.ts` | static news articles |

**Schema approach — parallel per-locale files (recommended).** Keep the pt files
untouched; add `teamAnalysis.en.json`, `groupAnalysis.en.json`, etc., keyed
identically. The server (`/api/team-view/:code`, and the group/match/player readers)
selects the file by request locale, falling back to pt when an `en` entry is missing.
Less invasive than converting every entry to `{pt, en}` in place, and it keeps the
existing pt-editing skills working unchanged.

Wire the three editorial-hidden component sites — `StandingsView.tsx:551`,
`TeamLineupView.tsx:1277`, `WorldCupNoteCarousel.tsx:26` — to **show** English
editorial (render when `en` content exists) instead of the `es` hide.

**Translation workflow — regenerate, don't machine-translate.** The project's
editorial skills (`analyze-match`, `update-group-analysis`,
`update-stale-team-analyses`, `mark-star-players`) generate copy **grounded in real
incidents pulled from the production API** — never invented. The highest-quality,
project-consistent path is to teach these skills an English-output mode and
**regenerate** the editorial in English from the same real data, rather than
translating pt prose. This preserves the "never invent data" rule and yields native
English voice. Freshness timestamps (`updatedAt`, `worldCupNoteUpdatedAt`) carry over.

> This phase is the long pole. It can proceed **in parallel** with Phases 1–2 and even
> after the shell launches (English editorial fills in behind the pt fallback), so it
> need not block the subdomain going live.

---

## Phase 4 — Formatting, polish, e2e (½ day)

- American date/number formatting verified end-to-end.
- Sweep for hardcoded pt JSX leaks (the `>[pt-word]<` grep) — the Instagram-feed class
  of bug where a whole component bypassed `t()`.
- **e2e route-mock gotcha (already hit this session):** non-default locales append
  `?language=en`, which misses bare-path `**/api/match-overlays` route mocks. The new
  `tests/e2e/english-locale.spec.ts` should mirror `spanish-locale.spec.ts` (which
  sidesteps overlay mocks); do **not** rely on bare-path mocks for an `en` run.
- Full Docker suite green (lint + unit + e2e) before any deploy.

---

## Phase 5 — Deploy (mirror the Spanish runbook, ~1 hour)

Per `docs/SPANISH_LOCALE_DEPLOY_RUNBOOK.md`, adapted for `en.`:

1. **Route53:** A record `en.copa2026.mpbarbosa.com` → `18.229.20.196` (same host).
2. **nginx:** add `en.copa2026.mpbarbosa.com` to `server_name` in **both** blocks of
   `/etc/nginx/sites-available/copa2026.mpbarbosa.com` (back up first); reload.
3. **TLS:** `certbot --nginx --expand --redirect -d copa2026… -d es.copa2026… -d
   en.copa2026…` to extend the existing SAN cert lineage.
4. One service serves all three locales via the Host header — no new process.
5. **Verify externally:** `html lang="en"`, English title/OG/canonical, http→https 301,
   and **no regression** on apex (pt) or `es.` (SAN cert covers all three names).

---

## Effort summary

| Phase | Scope | Size |
|---|---|---|
| 1 | Locale spine + 3-way picker | ½ day |
| 2 | ~860 keys + helper maps + server boundary + parity test | **2–4 days** |
| 3 | Editorial regenerated in English (parallel files) | **long pole — parallel/after launch** |
| 4 | Formatting + e2e + `english-locale.spec.ts` | ½ day |
| 5 | Route53 + nginx + certbot | ~1 hour |

**Critical-path insight:** the UI (Phases 1–2) must be ~complete before launch because
missing keys leak Portuguese to English readers — so those land behind the un-launched
subdomain, gated by the parity test. Editorial (Phase 3) can trail behind the pt
fallback and fill in continuously, so it does not block go-live.

## Rollout discipline

- Build on `agora-dev2`; land via `test-commit-sync`; the parity test must be green.
- Keep pt/`es` byte-identical — every change is additive (`en` arm), never a rewrite
  of existing branches, except the language picker and the `server.ts` inline-`es`
  refactor (both covered by e2e).
- Launch only after Phase 4's full suite is green and Phase 5 verification passes.
