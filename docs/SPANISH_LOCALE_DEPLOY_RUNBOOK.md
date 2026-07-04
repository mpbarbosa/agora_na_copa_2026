# Spanish (LATAM) locale — production deploy runbook

How to bring the Spanish shell live at **`es.copa2026.mpbarbosa.com`**. The app
code (Phases 0–3) is locale-aware and ships in the normal build; this runbook is
only the **infra** to route the `es.` subdomain to the same service. Run these on
the **production host** (SSH in), not locally.

## How it works (why this is so small)

The Express service already selects the locale from the request **Host header**
(`localeForRequest` / `localizeIndexHtml` → `localeFromHost(req.hostname)` in
`server.ts`). `app.set("trust proxy", 1)` is on and the existing nginx block
forwards `proxy_set_header Host $host`, so `req.hostname` is the real hostname the
visitor typed. Therefore **one service serves both languages**: requests to
`copa2026.mpbarbosa.com` render pt-BR, requests to `es.copa2026.mpbarbosa.com`
render es (Spanish UI + Spanish FIFA data + es SEO head + hidden editorial).

Nothing about the app or the deploy pipeline changes. We only need the es
hostname to (1) resolve in DNS, (2) be accepted by nginx and proxied to
`127.0.0.1:3001`, and (3) be covered by the TLS certificate.

The `hreflang` alternates (pt-BR / es / x-default) are already static in
`index.html`, so both hostnames advertise each other to search engines with no
per-host work.

## Prerequisites

- The current build (Phases 0–3) is **already live** on `copa2026.mpbarbosa.com`
  (verify: `curl -s https://copa2026.mpbarbosa.com/api/health` shows the expected
  version). Ship the code the normal way (`npm run deploy` from dev, then
  `npm run go-live` on the box) **before** exposing the subdomain — otherwise
  `es.` would serve a pt-only build.
- sudo on the host; nginx + certbot already installed (they are, from the
  original `04_setup_nginx.sh` / `05_setup_tls.sh` provisioning).
- The host's public IP (the same box `copa2026.mpbarbosa.com` points at —
  currently `18.229.20.196`).

## Step 1 — DNS

Add an **A record** for the subdomain pointing at the same host IP as the apex
app domain (in the `mpbarbosa.com` DNS provider):

```
Type: A
Name: es.copa2026            (i.e. es.copa2026.mpbarbosa.com)
Value: <same IPv4 as copa2026.mpbarbosa.com>
TTL: 300
```

(If `copa2026` is a CNAME, mirror that instead — a CNAME `es.copa2026 → copa2026.mpbarbosa.com` also works.)

Wait for propagation, then confirm on the host:

```bash
getent ahosts es.copa2026.mpbarbosa.com    # must resolve to the host IP
```

`05_setup_tls.sh` (below) refuses to run until this resolves.

## Step 2 — nginx (add the es hostname to the existing server block)

Because the app differentiates by Host, the cleanest option is to **serve both
names from the one existing server block** — no second upstream, no duplicate
config. Edit the existing conf:

```bash
sudo nano /etc/nginx/sites-available/copa2026.mpbarbosa.com
```

Change the `server_name` line(s) to include the subdomain. If certbot has already
split the file into an HTTPS (443) block and an HTTP→HTTPS redirect (80) block,
update `server_name` in **both** blocks:

```nginx
    server_name copa2026.mpbarbosa.com es.copa2026.mpbarbosa.com;
```

Then test + reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Sanity check over plain HTTP (before TLS covers it) — the app should already
answer for the new host and emit the Spanish head:

```bash
curl -s -H "Host: es.copa2026.mpbarbosa.com" http://127.0.0.1/ | grep -iE '<html lang|og:locale'
# expect: <html lang="es-419"> ... og:locale ... es_MX
```

> Alternative (separate block): if you prefer an isolated conf, run
> `./shell_scripts/04_setup_nginx.sh es.copa2026.mpbarbosa.com 3001` to generate a
> standalone HTTP block, then run Step 3 with the subdomain. Functionally
> identical; more files. The single-block approach above is recommended.

## Step 3 — TLS (extend the certificate to the subdomain)

Expand the existing Let's Encrypt cert to cover both names (SAN). certbot detects
the shared server block and reuses it:

```bash
sudo certbot --nginx --redirect --keep-until-expiring \
  -d copa2026.mpbarbosa.com -d es.copa2026.mpbarbosa.com
```

(Non-interactive form, matching `05_setup_tls.sh`:
`sudo certbot --nginx --redirect --keep-until-expiring --non-interactive --agree-tos --email <you@example.com> -d copa2026.mpbarbosa.com -d es.copa2026.mpbarbosa.com`.)

certbot rewrites the 443 block to present the SAN cert for both names and keeps
the HTTP→HTTPS redirect. Reload is automatic; if needed:
`sudo systemctl reload nginx`.

## Step 4 — Verify

```bash
# es subdomain serves Spanish head + SEO
curl -s https://es.copa2026.mpbarbosa.com/ | grep -iE '<html lang|<title>|og:locale|og:site_name|canonical|__AGORA_LOCALE__'
#   <html lang="es-419">
#   <title>Ahora en el Mundial 26 — Copa Mundial FIFA 2026 en vivo</title>
#   og:locale ... es_MX ; og:site_name ... "Ahora en el Mundial 26"
#   canonical ... https://es.copa2026.mpbarbosa.com/
#   window.__AGORA_LOCALE__="es"

# apex still Portuguese (regression check)
curl -s https://copa2026.mpbarbosa.com/ | grep -iE '<html lang|og:locale'
#   <html lang="pt-BR"> ... pt_BR

# FIFA data comes back in Spanish for the es locale
curl -s "https://es.copa2026.mpbarbosa.com/api/predict" -X POST \
  -H 'Content-Type: application/json' -d '{"homeTeam":"BRA","awayTeam":"ARG","language":"es"}' | head -c 120
#   {"text":"## Pronóstico ...

# TLS valid for the subdomain
echo | openssl s_client -servername es.copa2026.mpbarbosa.com -connect es.copa2026.mpbarbosa.com:443 2>/dev/null | openssl x509 -noout -text | grep -A1 'Subject Alternative Name'
```

Then load `https://es.copa2026.mpbarbosa.com/` in a browser: Spanish UI, the
language switcher offers "PT", editorial panels (group/team/match analyses,
player notes) are absent, and live scores/standings/lineups/predictor are present
and in Spanish.

## Analytics

Traffic to the es subdomain is distinguishable by hostname in the timed nginx
access logs (`agora_timed` format, set up by `08_setup_monitoring.sh`), so LATAM
traffic can be segmented in the traffic reports — the whole point of the
subdomain choice (see the monetization plan). No extra instrumentation needed.

## Rollback

Fast disable (no DNS change): remove `es.copa2026.mpbarbosa.com` from the
`server_name` line(s), `sudo nginx -t && sudo systemctl reload nginx`. Requests to
the subdomain then 404/`no such host` at nginx. Optionally remove the DNS record.
The cert can keep the SAN harmlessly. No app rollback is needed — the es code is
inert on the pt host.

## Notes / gotchas

- **Deploy order matters**: expose the subdomain only after the es-aware build is
  live, or `es.` serves a pt-only page.
- **Same service, shared caches**: FIFA response caches are keyed by language, so
  pt and es don't collide; a low-traffic es audience just adds a second cache
  slot per endpoint.
- **No `base` path issue**: this uses a subdomain (not a `/es/` subpath) exactly
  because the Vite build references absolute root asset paths — same reason the
  apex app is on its own subdomain (see `04_setup_nginx.sh` header).
- **`go-live` is unaffected**: `10_go_live.sh` restarts the one service; both
  hostnames come back together.
