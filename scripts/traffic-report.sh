#!/usr/bin/env bash
#
# traffic-report.sh — Phase 0 traffic baseline for "Agora na Copa 26".
#
# Run this ON THE PRODUCTION HOST (ubuntu@ip-172-31-7-80), where the nginx
# access log lives. Delivery path: the host has this repo checked out at main,
# so:
#     git -C ~/Documents/GitHub/agora_na_copa_2026 pull
#     bash scripts/traffic-report.sh
#
# It ALWAYS prints a dependency-free text summary (coreutils + awk only) so you
# get interpretable numbers even on a bare host, and ADDITIONALLY writes a rich
# GoAccess HTML + JSON report when GoAccess is installed.
#
# GEO (opt-in, fully local — no user IP ever leaves the host):
#   If a MaxMind GeoLite2 mmdb is present AND `mmdblookup` is installed, the text
#   summary gains "Top countries" tallies (by unique visitor and by request
#   volume), and GoAccess (if present) gets a Geo Location panel. Resolve order:
#     1) $GEO_DB env var, if set and readable
#     2) /var/lib/GeoIP/GeoLite2-{Country,City}.mmdb
#     3) /usr/share/GeoIP/GeoLite2-{Country,City}.mmdb
#   One-time prod setup:
#     sudo apt-get install -y mmdb-bin        # provides mmdblookup
#     # download GeoLite2-Country.mmdb (free MaxMind account/license key) to
#     # /var/lib/GeoIP/  — or point GEO_DB at it.
#   Country lookups run once per UNIQUE IP (not per log line), so it stays cheap.
#
# Outputs land in ./traffic-reports/ (gitignored):
#   summary-<stamp>.txt   always
#   report-<stamp>.html   if goaccess present
#   report-<stamp>.json   if goaccess present
#
# Matches the "agora_timed" nginx log_format from
# shell_scripts/08_setup_monitoring.sh:
#   $remote_addr - [$time_local] "$request" $status $body_bytes_sent
#   "$http_referer" "$http_user_agent" rt=$request_time urt=$upstream_response_time
#
# Field positions (space-tokenized): $1 ip  $3 [date:time  $5 "METHOD  $6 path
#   $7 HTTP/x"  $8 status  $9 bytes  $10 "referer"  rt=… urt=… at the tail.

set -euo pipefail

ACCESS_LOG="${1:-/var/log/nginx/agora-na-copa.access.log}"
OUT_DIR="${2:-traffic-reports}"
STAMP="$(date +%Y%m%d-%H%M%S)"

# Stream plain + rotated (.1) + gzipped (.2.gz, …) logs together. Use sudo only
# if the log is not directly readable (it is root-owned in /var/log/nginx).
reader() {
  if [[ -r "$ACCESS_LOG" ]]; then
    zcat -f "$ACCESS_LOG"*
  else
    sudo zcat -f "$ACCESS_LOG"*
  fi
}

if ! compgen -G "$ACCESS_LOG*" >/dev/null 2>&1; then
  if ! sudo test -e "$ACCESS_LOG"; then
    echo "Error: access log not found at $ACCESS_LOG" >&2
    echo "Pass the log path as the first argument if it lives elsewhere." >&2
    exit 1
  fi
fi

mkdir -p "$OUT_DIR"
TXT_OUT="$OUT_DIR/summary-$STAMP.txt"

# ── Dependency-free text summary ──────────────────────────────────────────────
# Buffer the (possibly sudo-gated) log once into a temp file so we scan it many
# times without re-prompting for sudo or re-decompressing on every awk pass.
TMP_LOG="$(mktemp)"
GEO_MAP=""
trap 'rm -f "$TMP_LOG" "$GEO_MAP"' EXIT
reader > "$TMP_LOG"

# ── Resolve a local GeoLite2 mmdb (no user IP leaves the host) ─────────────────
GEO_DB="${GEO_DB:-}"
for cand in "$GEO_DB" \
  /var/lib/GeoIP/GeoLite2-Country.mmdb /var/lib/GeoIP/GeoLite2-City.mmdb \
  /usr/share/GeoIP/GeoLite2-Country.mmdb /usr/share/GeoIP/GeoLite2-City.mmdb; do
  if [[ -n "$cand" && -r "$cand" ]]; then GEO_DB="$cand"; break; fi
done

# Build an ip<TAB>country map once, over UNIQUE IPs only, when both the db and the
# lookup tool are available. Reused by both country tallies below.
if [[ -n "$GEO_DB" ]] && command -v mmdblookup >/dev/null 2>&1; then
  GEO_MAP="$(mktemp)"
  awk '{print $1}' "$TMP_LOG" | sort -u | while read -r ip; do
    country="$(mmdblookup --file "$GEO_DB" --ip "$ip" country names en 2>/dev/null \
      | awk -F'"' 'NF>1 {print $2; exit}')"
    printf '%s\t%s\n' "$ip" "${country:-(unknown)}"
  done > "$GEO_MAP"
fi

{
  echo "Agora na Copa 26 — traffic baseline (Phase 0)"
  echo "Generated: $(date --iso-8601=seconds)"
  echo "Source:    $ACCESS_LOG* ($(wc -l < "$TMP_LOG") log lines)"
  echo

  echo "== Totals =="
  printf "Requests:       %s\n" "$(wc -l < "$TMP_LOG")"
  printf "Unique IPs:     %s\n" "$(awk '{print $1}' "$TMP_LOG" | sort -u | wc -l)"
  printf "Date range:     %s  ->  %s\n" \
    "$(sed -n '1p' "$TMP_LOG" | awk '{print $3}' | tr -d '[')" \
    "$(tail -n1 "$TMP_LOG" | awk '{print $3}' | tr -d '[')"
  echo

  echo "== Top 20 requested paths =="
  awk '{print $6}' "$TMP_LOG" | sort | uniq -c | sort -rn | head -20
  echo

  echo "== HTTP status codes =="
  awk '{print $8}' "$TMP_LOG" | sort | uniq -c | sort -rn
  echo

  echo "== Top 20 referrers =="
  awk '{print $10}' "$TMP_LOG" | sort | uniq -c | sort -rn | head -20
  echo

  echo "== Top countries =="
  if [[ -n "$GEO_MAP" ]]; then
    echo "Geo source: $GEO_DB"
    echo "-- by unique visitor (top 20) --"
    cut -f2 "$GEO_MAP" | sort | uniq -c | sort -rn | head -20
    echo "-- by request volume (top 20) --"
    # Join each log line's IP ($1) to its country via the tab-separated GEO_MAP.
    awk 'FNR==NR { split($0, a, "\t"); c[a[1]] = a[2]; next }
         { print ($1 in c ? c[$1] : "(unknown)") }' "$GEO_MAP" "$TMP_LOG" \
      | sort | uniq -c | sort -rn | head -20
  else
    echo "(GeoIP unavailable — need a GeoLite2 mmdb + mmdblookup. Install with"
    echo " 'sudo apt-get install -y mmdb-bin' and place GeoLite2-Country.mmdb in"
    echo " /var/lib/GeoIP/, or set GEO_DB=/path/to/db.mmdb, then re-run.)"
  fi
  echo

  echo "== Requests by hour of day =="
  awk '{print $3}' "$TMP_LOG" | cut -d: -f2 | sort | uniq -c | sort -k2 -n
  echo

  echo "== Requests by day =="
  awk '{print $3}' "$TMP_LOG" | cut -d: -f1 | tr -d '[' | sort | uniq -c
  echo

  TOTAL="$(wc -l < "$TMP_LOG")"
  BOTS="$(grep -iEc 'bot|crawl|spider|slurp|bytespider|facebookexternalhit|WhatsApp' "$TMP_LOG" || true)"
  echo "== Bot / crawler share =="
  printf "Bot-ish hits:   %s of %s\n" "$BOTS" "$TOTAL"
  echo

  # Players/clubs that exist ONLY in the Playwright e2e specs (tests/e2e/), never
  # in prod data — so every hit is a synthetic driver (a monitor or an e2e run)
  # pointed at the live site, not a real user, and every one 404s. They inflate
  # the /api/player-stats counts in the "Top paths" section above, so surface and
  # attribute them here. Keep this pattern in sync with the fixtures in
  # tests/e2e/{team-view,navigation,leaders}.spec.ts.
  echo "== Suspect / synthetic paths (e2e test fixtures) =="
  SUSPECT_RE='Atacante%20Teste|Goleiro%20Teste|Abdulilah%20Alamri|Clube%20Teste'
  SUSPECT_HITS="$(grep -aEc "$SUSPECT_RE" "$TMP_LOG" || true)"
  printf "Suspect hits:   %s of %s\n" "$SUSPECT_HITS" "$TOTAL"
  if [[ "${SUSPECT_HITS:-0}" -gt 0 ]]; then
    echo "-- by source (count · ip · status · user-agent) --"
    grep -aE "$SUSPECT_RE" "$TMP_LOG" \
      | awk '{ ip=$1; st=$8;
               ua=$0; sub(/.*" [0-9]+ [0-9]+ "[^"]*" "/, "", ua); sub(/" rt=.*/, "", ua);
               print ip, st, ua }' \
      | sort | uniq -c | sort -rn | head -10
  fi
} | tee "$TXT_OUT"

echo
echo "Text summary saved to: $TXT_OUT"

# ── Rich GoAccess report (optional) ───────────────────────────────────────────
LOG_FORMAT='%h - [%d:%t %^] "%r" %s %b "%R" "%u" rt=%T urt=%^'
if command -v goaccess >/dev/null 2>&1; then
  HTML_OUT="$OUT_DIR/report-$STAMP.html"
  JSON_OUT="$OUT_DIR/report-$STAMP.json"
  # Feed GoAccess the same local mmdb (if any) for its Geo Location panel.
  GEO_ARGS=()
  if [[ -n "$GEO_DB" ]]; then
    GEO_ARGS=(--geoip-database "$GEO_DB")
    echo "==> GoAccess geo panel using: $GEO_DB"
  fi
  echo "==> GoAccess found — writing $HTML_OUT and $JSON_OUT"
  goaccess "$TMP_LOG" --log-format="$LOG_FORMAT" \
    --date-format='%d/%b/%Y' --time-format='%H:%M:%S' \
    --anonymize-ip --no-query-string "${GEO_ARGS[@]}" -o "$HTML_OUT"
  goaccess "$TMP_LOG" --log-format="$LOG_FORMAT" \
    --date-format='%d/%b/%Y' --time-format='%H:%M:%S' \
    --anonymize-ip --no-query-string "${GEO_ARGS[@]}" -o "$JSON_OUT"
  echo "View HTML: scp ubuntu@<host>:$(pwd)/$HTML_OUT ."
else
  echo
  echo "(GoAccess not installed — text summary only. For the HTML dashboard:"
  echo "   sudo apt-get update && sudo apt-get install -y goaccess"
  echo " then re-run this script.)"
fi
