# Monetization & Analytics Plan

_Created 2026-06-21 — during the live FIFA World Cup 2026 (ends ~2026-07-19)._

## Objective

Measure the site's real traffic numbers, then monetize to **cover hosting costs**
(~$10–40/mo AWS) and build a **portfolio case study**. Context: the owner is
job-hunting; the portfolio narrative is the bigger prize, but covering costs is a
concrete near-term win achievable within the Cup's peak-traffic window.

## Decisions

| Decision | Choice |
|---|---|
| Revenue lanes | **Google AdSense** (display ads) + **non-gambling affiliates** (Amazon Associates BR — football merch/electronics, streaming sign-ups) |
| Explicitly excluded | Sports-betting affiliates; Pix/donations tip jar |
| Priority | **Cover costs fastest** — the Cup is live, ~4 weeks of peak traffic remain |

## Starting state (verified 2026-06-21)

- **Zero web analytics.** No GA, Plausible, PostHog, etc. (`index.html`, `src/main.tsx`).
- **Only existing visitor data:** nginx access log `/var/log/nginx/agora-na-copa.access.log`
  (IP, time, status, bytes, referer, user-agent, `rt=`/`urt=` timings) and per-request
  journald logs (`server.ts:103-113`).
- **No SEO/discoverability:** no `<meta description>`, no OpenGraph/Twitter cards,
  no `sitemap.xml`, no `robots.txt`.
- **No monetization code** anywhere.
- **Infra:** single AWS host, `systemd` service `agora-na-copa-2026`, nginx,
  domain `copa2026.mpbarbosa.com`. GoAccess already referenced in
  `shell_scripts/08_setup_monitoring.sh`.

## Honest framing

At single-host scale, **covering costs is achievable; large income is not.** Display
ads earn pennies per thousand views at Brazilian CPMs. The dependable plays for this
window are affiliates + SEO. The strongest outcome is the **portfolio case study**:
_measured X → hypothesized Y → shipped Z → moved metric W%._

## Roadmap (ordered by speed-to-revenue)

### ① Today — Baseline from existing data (Phase 0)
Run **GoAccess** against the existing nginx log. Outputs: pageviews, unique visitors,
top views (of the 11 nav tabs), referrers, bot share, geography, and kickoff-time
concurrency. Tells us whether there's enough traffic to monetize and **where** to place
ads/affiliate links. Deliverable: `scripts/traffic-report.sh` + the exact GoAccess
format string matching the custom `rt=`/`urt=` log fields.

### ② Today/tomorrow — Open the funnel (SEO, no approval)
Add `<meta description>`, OpenGraph + Twitter cards, `sitemap.xml`, `robots.txt`.
Highest-leverage growth move; hours of work; compounds every revenue stream.

### ③ Day 1–2 — Amazon Associates BR (fastest real revenue)
No weeks-long approval. Reusable `AffiliateLink` component with click tracking, placed
contextually in the hottest views (jerseys, TVs, football gear). Fits the existing
broadcaster content.

### ④ Day 1 (runs in background) — Apply to AdSense
Needs a pt-BR privacy-policy page + LGPD/consent banner + `ads.txt`. **Approval can take
days–weeks and may not land before the Cup ends** → treat as the longer-tail/evergreen
bet. Prepare ad slots now so units drop in on approval. Affiliates + SEO carry the
4-week window.

### ⑤ GA4 + consent banner
AdSense forces a consent banner anyway, so GA4 (free, recognizable to employers, rich
funnels) is the pragmatic pick. Track ad/affiliate clicks as events to measure what
actually earns.

### ⑥ Iterate + write the case study
Tune placements on two weeks of data; write the portfolio artifact — earned "for free"
by building ③–⑤ cleanly.

## Open items / inputs needed

- SSH alias for `copa2026.mpbarbosa.com` to run Phase 0 (or owner runs
  `! bash scripts/traffic-report.sh` once written).
