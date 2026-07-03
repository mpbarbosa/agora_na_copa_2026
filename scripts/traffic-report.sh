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

# ── Snapshot-to-snapshot delta (vs. the previous summary) ─────────────────────
# Diff this run's top-paths against the most recent PRIOR summary-*.txt in
# OUT_DIR and print per-path deltas plus a per-minute rate derived from the two
# "Generated:" timestamps. Turns the manual 30-min comparisons into a built-in
# section: a synthetic driver shows up as a path climbing at a steady Δ/min.
# Purely additive and read-only against the prior file; skips on the first run.
PREV_TXT="$(ls -1t "$OUT_DIR"/summary-*.txt 2>/dev/null | grep -vxF "$TXT_OUT" | head -1 || true)"
if [[ -n "${PREV_TXT:-}" && -r "$PREV_TXT" ]]; then
  # Elapsed wall-clock between the two snapshots, from their Generated: stamps.
  gen_prev="$(awk '/^Generated:/{print $2; exit}' "$PREV_TXT")"
  gen_cur="$(awk '/^Generated:/{print $2; exit}' "$TXT_OUT")"
  elapsed=0
  if s_prev="$(date -d "$gen_prev" +%s 2>/dev/null)" \
     && s_cur="$(date -d "$gen_cur" +%s 2>/dev/null)"; then
    elapsed=$(( s_cur - s_prev ))
  fi
  # Compute the table off the pristine files BEFORE we append anything to TXT_OUT.
  delta_table="$(awk -v elapsed="$elapsed" '
    # First file (previous snapshot): capture its top-paths block.
    FNR==NR {
      if ($0 ~ /^== Top 20 requested paths ==/) { inp=1; next }
      if (inp && $0 ~ /^== /) inp=0
      if (inp && $1 ~ /^[0-9]+$/ && NF>=2) prev[$2]=$1
      next
    }
    # Second file (current snapshot): capture its top-paths block.
    {
      if ($0 ~ /^== Top 20 requested paths ==/) { inc=1; next }
      if (inc && $0 ~ /^== /) inc=0
      if (inc && $1 ~ /^[0-9]+$/ && NF>=2) { cur[$2]=$1; seen[$2]=1 }
    }
    END {
      for (p in prev) seen[p]=1
      n=0
      for (p in seen) {
        c=(p in cur)?cur[p]:0; v=(p in prev)?prev[p]:0
        n++; path[n]=p; C[n]=c; V[n]=v; D[n]=c-v
      }
      # Rank by magnitude of change (insertion sort; n is small).
      for (i=1;i<=n;i++) for (j=i+1;j<=n;j++) {
        ai=D[i]<0?-D[i]:D[i]; aj=D[j]<0?-D[j]:D[j]
        if (aj>ai) {
          t=path[i];path[i]=path[j];path[j]=t;
          t=C[i];C[i]=C[j];C[j]=t; t=V[i];V[i]=V[j];V[j]=t; t=D[i];D[i]=D[j];D[j]=t }
      }
      printf "%-46s %10s %10s %8s %9s\n","path","prev","cur","delta","d/min"
      for (i=1;i<=n && i<=20;i++) {
        rate=(elapsed>0)? D[i]*60.0/elapsed : 0
        printf "%-46s %10d %10d %+8d %+9.1f\n", path[i], V[i], C[i], D[i], rate
      }
    }
  ' "$PREV_TXT" "$TXT_OUT")"

  {
    echo
    echo "== Delta vs. previous snapshot =="
    printf "Previous: %s (%s)\n" "$PREV_TXT" "$gen_prev"
    printf "Current:  %s (%s)\n" "$TXT_OUT" "$gen_cur"
    if [[ "$elapsed" -gt 0 ]]; then
      printf "Elapsed:  %ss (%s min)\n" "$elapsed" "$(awk -v e="$elapsed" 'BEGIN{printf "%.1f", e/60}')"
    else
      echo "Elapsed:  (unknown — could not parse both timestamps; rates shown as 0)"
    fi
    echo "-- top movers by |delta| (prev · cur · delta · per-minute) --"
    echo "$delta_table"
  } | tee -a "$TXT_OUT"
fi
