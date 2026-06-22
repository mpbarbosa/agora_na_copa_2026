# Pending issues — living checklist

A single place to track open items so nothing gets forgotten. Tick boxes as they
land. **Last updated: 2026-06-22.**

**Version state at last update:** repo/`origin/main` = `0.0.297` · **production live = `0.0.290`** (prod is behind — see Ops #1).

---

## 🔴 Blocked on you (external accounts) — each is a ~1-line code change once provided

- [ ] **AdSense — create a Display ad unit.** Account is active (`ca-pub-9509229216258895`); publisher id + `ads.txt` are wired, but the ad slot is a placeholder so **no ads render**. In AdSense: *Anúncios → Por unidade de anúncio → Display* → send the 10-digit `data-ad-slot` → set `ADSENSE_AD_SLOT` in `src/config.ts`.
- [ ] **AdSense — verify/connect the site.** Try the **ads.txt** method first (already published with the real pub id). If Google demands the `<head>` snippet, decide consent handling (Google Consent Mode). See ADR 0003 context.
- [ ] **Amazon Associates — finish tax/payment info** (CPF + bank transfer; no Pix). Required to receive payouts.
- [ ] **Amazon Associates — drive ≥1 qualifying sale by ~2026-12-19** (180-day rule) or the account is revoked. Currently earning to `agoracopa-20`.

## 🟠 Ops / deploy

- [ ] **Redeploy production.** Live = `0.0.290`, deploy repo = `0.0.297`. On the prod host: `cd ~/Documents/GitHub/agora_na_copa_2026 && git pull && npm run deploy`. Catches up the feature tour, GA4, readability/badge fixes, and the data-work videos/analyses/skills. (Swap is in place — build won't thrash.)
- [ ] **Verify GA4 after redeploy.** Open site → *Aceitar* cookies → click tabs + an affiliate link → GA4 *Reports → Realtime* should show `page_view` + `select_affiliate` within ~30s.
- [ ] **Concurrent-session push race.** The code session (`main`) and data session (`data-work` worktree) both push to `main`, causing version-collision rebases. The data-work skills are being hardened for this; until settled, reconcile when shipping code, or pause the data session during a code release. See [[project_concurrent_code_data_worktree]].
- [ ] **Prune leftover agent worktree** under `.claude/worktrees/agent-…` (`git worktree prune`). The `../agora-data` worktree is intentional — keep it.

## 🟡 Engineering — designed but not built

- [ ] **Runtime-JSON content loading** (`docs/adr/0002`). Serve the frequently-edited content JSON at runtime so data updates skip the full rebuild (removes the deploy-OOM risk for the most common change). Phase 1 ≈ half a day.
- [ ] **EC2 roadmap Phases 2–4** (`devops/copa_2026/EC2_CAPACITY_DEPLOY_SAFETY_ROADMAP.md`): no-build go-live, systemd memory guardrails, instance upgrade-if-needed. (Phase 1 swap ✅ done.)
- [ ] **CloudWatch monitoring** (`devops/copa_2026/CLOUDWATCH_MONITORING_ROADMAP.md`): SNS alerts + uptime canaries + dashboard. Planned, not implemented.

## 🟢 Product / analytics follow-ups

- [ ] **Tune feature-tour steps from GA4 data.** Once GA collects ~a few days, target the *actually* under-used features (low `page_view` tabs); edit `src/featureTour.ts`. Then measure if the tour lifts usage.
- [ ] **Optional: in-view coachmarks** for hidden interactions (tap-a-player opens a profile, the Escalação/Pré-jogo sub-tabs).
- [ ] **Optional: "Como usar" static page** as a supplement to the tour.
- [ ] **Step 5 — portfolio case study.** The career artifact: problem → measured → shipped → moved-the-numbers, using GA4 before/after data. Not started.

## 🔵 Content / data gaps

- [ ] **Player `pictureUrl` coverage** — 46 of 374 players missing (per [[project_picture_url_coverage]]).
- [ ] **`analyze-match` sentence length** — generate shorter sentences for readability (from the Prévia readability assessment).

## ⚪ Benign — no action needed (recorded so they don't get re-investigated)

- AdSense `fb:app_id` "missing property" warning — cosmetic; only needed for FB share analytics.
- `/` returning HTTP `206` to the FB scraper — expected (range request); the card scrapes fine.

---

## ✅ Done (recent, for context)

- Step 0 traffic baseline · Step 1 SEO + OG/social card · Step 2 Amazon affiliate strip (earning `agoracopa-20`) · Step 3 AdSense scaffold + LGPD consent + privacy policy · Step 4 GA4 + click tracking (**activated, id `G-53CP8JNP5R`**).
- Readability fixes #1/#2/#3 (measure cap + Inter body + badge-overlap clearance).
- Prod swap file (EC2 Phase 1).
- Feature-discovery guided tour (Driver.js) shipped.
- Share button (Web Share API + copy-link fallback, GA4 `share` event).
- Git worktree for concurrent code/data sessions.
