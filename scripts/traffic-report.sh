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
#   volume), and GoAccess (if present) gets a Geo Location panel. Resolve order
#   (City preferred over Country when both exist — a City db is a superset that
#   also drives the country tallies, so it loses nothing and adds the cities):
#     1) $GEO_DB env var, if set and readable
#     2) /var/lib/GeoIP/GeoLite2-{City,Country}.mmdb
#     3) /usr/share/GeoIP/GeoLite2-{City,Country}.mmdb
#   If the resolved db is a *City* db (detected via its metadata database_type),
#   the summary ALSO gains a "Top cities" tally. A Country db still only yields
#   the country tallies — the city section then just prints a hint to install the
#   City db. City-level geolocation is materially less precise than country
#   (esp. mobile/CGNAT IPs), so expect a larger "(unknown)" bucket there.
#   One-time prod setup:
#     sudo apt-get install -y mmdb-bin        # provides mmdblookup
#     # download GeoLite2-Country.mmdb (or GeoLite2-City.mmdb — a superset that
#     # also drives the country tallies) with a free MaxMind account/license key
#     # to /var/lib/GeoIP/  — or point GEO_DB at it.
#   Lookups run once per UNIQUE IP (not per log line), so it stays cheap (a City
#   db adds one extra lookup per unique IP for the city name).
#
# Outputs land in ./traffic-reports/ (tracked in git — the summary-*.txt files
# are committed by hand when a snapshot is worth sharing; new runs just show up
# as untracked files until then):
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

# ── Drop the app's own server-side client (agora-na-copa-2026/x.y) ─────────────
# Secondary instances hit prod with this User-Agent — mostly a misconfigured
# poller looping on 301 redirects over a non-canonical base URL, plus some
# sanctioned /api/fifa-proxy fallback fetches. Either way it is machine traffic,
# not a visitor, and as of 2026-07 it is ~85-90% of all log lines across many IPs,
# swamping every tally below. Count it once for transparency, then filter it out
# of $TMP_LOG so every downstream section (Totals, Top paths, status, referrers,
# geo, hour/day, bots, suspect) reflects real humans. Matches the UA family (any
# version) so it catches every such instance, not one IP — the right knob, since
# the offenders rotate IPs.
SELF_CLIENT_RE='"agora-na-copa-2026/[0-9.]+"'
SELF_CLIENT_HITS="$(grep -aEc "$SELF_CLIENT_RE" "$TMP_LOG" || true)"
if [[ "${SELF_CLIENT_HITS:-0}" -gt 0 ]]; then
  grep -avE "$SELF_CLIENT_RE" "$TMP_LOG" > "$TMP_LOG.filtered" && mv "$TMP_LOG.filtered" "$TMP_LOG"
fi

# ── Resolve a local GeoLite2 mmdb (no user IP leaves the host) ─────────────────
# Prefer City over Country when both are present: a City db is a superset that
# also drives the country tallies, so picking it loses nothing and unlocks the
# "Top cities" section. $GEO_DB (if set) still wins outright.
GEO_DB="${GEO_DB:-}"
GEO_HAS_CITY=0
for cand in "$GEO_DB" \
  /var/lib/GeoIP/GeoLite2-City.mmdb /var/lib/GeoIP/GeoLite2-Country.mmdb \
  /usr/share/GeoIP/GeoLite2-City.mmdb /usr/share/GeoIP/GeoLite2-Country.mmdb; do
  if [[ -n "$cand" && -r "$cand" ]]; then GEO_DB="$cand"; break; fi
done

# Does the resolved db carry city records? Probe its metadata: `mmdblookup
# --verbose` prints a header whose `Type:` line is e.g. "GeoLite2-City" vs
# "GeoLite2-Country" (the type is independent of the probe IP; 8.8.8.8 is just a
# well-formed address to satisfy the required --ip). Matching the type — not the
# filename — so a $GEO_DB that points at a renamed City db is still detected.
if [[ -n "$GEO_DB" ]] && command -v mmdblookup >/dev/null 2>&1; then
  if mmdblookup --file "$GEO_DB" --ip 8.8.8.8 --verbose 2>/dev/null \
       | grep -iE '^[[:space:]]*Type:' | grep -qi 'city'; then
    GEO_HAS_CITY=1
  fi
fi

# Build a per-UNIQUE-IP map once, when both the db and the lookup tool are
# available. Columns (tab-separated): ip <TAB> country <TAB> cityLabel.
#   - country  drives the "Top countries" tallies (always populated).
#   - cityLabel drives "Top cities" and is "<City>, <Country>" (empty when the
#     db has no city record for the ip, or the db is Country-level).
# Reused by every geo tally below. Backward-compatible: the country tallies read
# field 2 exactly as before.
if [[ -n "$GEO_DB" ]] && command -v mmdblookup >/dev/null 2>&1; then
  GEO_MAP="$(mktemp)"
  awk '{print $1}' "$TMP_LOG" | sort -u | while read -r ip; do
    # mmdblookup exits non-zero (5) when the lookup PATH is absent from an
    # otherwise-present record — routine for `city` (many City-db records have no
    # city node) and possible for `country`. Under `set -euo pipefail` that would
    # abort the whole run, so tolerate it with `|| true` and let the empty value
    # fall through to "(unknown)". (Harmless on a Country db, where every record
    # carries a country and the path always resolves.)
    country="$(mmdblookup --file "$GEO_DB" --ip "$ip" country names en 2>/dev/null \
      | awk -F'"' 'NF>1 {print $2; exit}' || true)"
    city_label=""
    if [[ "$GEO_HAS_CITY" == 1 ]]; then
      city="$(mmdblookup --file "$GEO_DB" --ip "$ip" city names en 2>/dev/null \
        | awk -F'"' 'NF>1 {print $2; exit}' || true)"
      # Qualify the city with its country so same-named cities across countries
      # don't collapse into one bucket. Leave empty when the db has no city.
      [[ -n "$city" ]] && city_label="$city, ${country:-?}"
    fi
    printf '%s\t%s\t%s\n' "$ip" "${country:-(unknown)}" "$city_label"
  done > "$GEO_MAP"
fi

# NOTE: the "top N" tallies below end in `awk 'NR<=N'`, not `head -N`, on purpose.
# `head` closes the pipe after N lines; on a large log the upstream `sort` then
# dies with EPIPE ("sort: write error"), and under `set -euo pipefail` that aborts
# the whole script right after the first tally — which is exactly why every report
# was truncated to ~30 lines (Totals + Top-paths) on the 450k-line prod log.
# `awk 'NR<=N'` drains the stream (prints the first N, discards the rest), so the
# upstream sort never SIGPIPEs. Do NOT swap it back to `head`.
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
  awk '{print $6}' "$TMP_LOG" | sort | uniq -c | sort -rn | awk 'NR<=20'
  echo

  echo "== HTTP status codes =="
  awk '{print $8}' "$TMP_LOG" | sort | uniq -c | sort -rn
  echo

  echo "== Top 20 referrers =="
  awk '{print $10}' "$TMP_LOG" | sort | uniq -c | sort -rn | awk 'NR<=20'
  echo

  echo "== Top countries =="
  if [[ -n "$GEO_MAP" ]]; then
    echo "Geo source: $GEO_DB"
    echo "-- by unique visitor (top 20) --"
    cut -f2 "$GEO_MAP" | sort | uniq -c | sort -rn | awk 'NR<=20'
    echo "-- by request volume (top 20) --"
    # Join each log line's IP ($1) to its country via the tab-separated GEO_MAP.
    awk 'FNR==NR { split($0, a, "\t"); c[a[1]] = a[2]; next }
         { print ($1 in c ? c[$1] : "(unknown)") }' "$GEO_MAP" "$TMP_LOG" \
      | sort | uniq -c | sort -rn | awk 'NR<=20'
  else
    echo "(GeoIP unavailable — need a GeoLite2 mmdb + mmdblookup. Install with"
    echo " 'sudo apt-get install -y mmdb-bin' and place GeoLite2-Country.mmdb in"
    echo " /var/lib/GeoIP/, or set GEO_DB=/path/to/db.mmdb, then re-run.)"
  fi
  echo

  echo "== Top cities =="
  if [[ -n "$GEO_MAP" && "$GEO_HAS_CITY" == 1 ]]; then
    echo "Geo source: $GEO_DB"
    echo "Note: city-level geolocation is far less precise than country; expect a"
    echo "      sizable (unknown) bucket, especially for mobile/CGNAT IPs."
    echo "-- by unique visitor (top 20) --"
    # Field 3 is the "<City>, <Country>" label (empty when the db had no city
    # for that ip); render the empties as (unknown) so they tally into one bucket.
    cut -f3 "$GEO_MAP" | sed 's/^$/(unknown)/' | sort | uniq -c | sort -rn | awk 'NR<=20'
    echo "-- by request volume (top 20) --"
    # Join each log line's IP ($1) to its city label (map field 3) via GEO_MAP.
    awk 'FNR==NR { split($0, a, "\t"); c[a[1]] = a[3]; next }
         { print (($1 in c) && c[$1] != "" ? c[$1] : "(unknown)") }' "$GEO_MAP" "$TMP_LOG" \
      | sort | uniq -c | sort -rn | awk 'NR<=20'
  elif [[ -n "$GEO_MAP" ]]; then
    echo "(Geo db is Country-level — install GeoLite2-City.mmdb for city tallies,"
    echo " then re-run. See the GEO note at the top of this script.)"
  else
    echo "(GeoIP unavailable — see the note under Top countries.)"
  fi
  echo

  echo "== Requests by hour of day =="
  awk '{print $3}' "$TMP_LOG" | cut -d: -f2 | sort | uniq -c | sort -k2 -n
  echo

  echo "== Requests by day =="
  awk '{print $3}' "$TMP_LOG" | cut -d: -f1 | tr -d '[' | sort | uniq -c
  echo

  # Transparency line for the self-client filter applied above: how many machine
  # hits (the app's own agora-na-copa-2026/x.y poller) were dropped before any
  # tally ran. Parsed by traffic-report-core into `selfClientExcluded`.
  echo "== Self-client (excluded) =="
  printf "Self-client hits (excluded): %s\n" "${SELF_CLIENT_HITS:-0}"
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
      | sort | uniq -c | sort -rn | awk 'NR<=10'
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

  # City movers — same |delta| treatment as paths, but scoped to the "by request
  # volume" sub-block INSIDE the "== Top cities ==" section (the country section
  # carries an identically-named "-- by request volume --" marker, so we gate on
  # being inside Top-cities first). The city label "<City>, <Country>" contains
  # spaces, so we key on the whole line after the leading count, not $2. Only
  # computed when this run emitted a city section (a City db was loaded); an older
  # prior snapshot without the section simply yields all-new (+) rows.
  city_delta_table=""
  if [[ "$GEO_HAS_CITY" == 1 ]]; then
    city_delta_table="$(awk -v elapsed="$elapsed" '
      # First file (previous snapshot): capture Top-cities request-volume rows.
      FNR==NR {
        if ($0 ~ /^== Top cities ==/)            { inp=1; rvp=0; next }
        if (inp && $0 ~ /^== /)                  { inp=0; rvp=0 }
        if (inp && $0 ~ /^-- by request volume/) { rvp=1; next }
        else if (inp && rvp && $0 ~ /^-- /)      { rvp=0 }
        if (inp && rvp && $1 ~ /^[0-9]+$/ && NF>=2) {
          lab=$0; sub(/^[[:space:]]*[0-9]+[[:space:]]+/, "", lab); prev[lab]=$1
        }
        next
      }
      # Second file (current snapshot): same capture.
      {
        if ($0 ~ /^== Top cities ==/)            { inc=1; rvc=0; next }
        if (inc && $0 ~ /^== /)                  { inc=0; rvc=0 }
        if (inc && $0 ~ /^-- by request volume/) { rvc=1; next }
        else if (inc && rvc && $0 ~ /^-- /)      { rvc=0 }
        if (inc && rvc && $1 ~ /^[0-9]+$/ && NF>=2) {
          lab=$0; sub(/^[[:space:]]*[0-9]+[[:space:]]+/, "", lab); cur[lab]=$1; seen[lab]=1
        }
      }
      END {
        for (p in prev) seen[p]=1
        n=0
        for (p in seen) {
          c=(p in cur)?cur[p]:0; v=(p in prev)?prev[p]:0
          n++; city[n]=p; C[n]=c; V[n]=v; D[n]=c-v
        }
        if (n==0) exit
        # Rank by magnitude of change (insertion sort; n is small).
        for (i=1;i<=n;i++) for (j=i+1;j<=n;j++) {
          ai=D[i]<0?-D[i]:D[i]; aj=D[j]<0?-D[j]:D[j]
          if (aj>ai) {
            t=city[i];city[i]=city[j];city[j]=t;
            t=C[i];C[i]=C[j];C[j]=t; t=V[i];V[i]=V[j];V[j]=t; t=D[i];D[i]=D[j];D[j]=t }
        }
        printf "%-40s %10s %10s %8s %9s\n","city","prev","cur","delta","d/min"
        for (i=1;i<=n && i<=20;i++) {
          rate=(elapsed>0)? D[i]*60.0/elapsed : 0
          printf "%-40s %10d %10d %+8d %+9.1f\n", city[i], V[i], C[i], D[i], rate
        }
      }
    ' "$PREV_TXT" "$TXT_OUT")"
  fi

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
    echo "-- top path movers by |delta| (prev · cur · delta · per-minute) --"
    echo "$delta_table"
    if [[ -n "${city_delta_table:-}" ]]; then
      echo
      echo "-- top city movers by |delta| (request volume; prev · cur · delta · per-minute) --"
      echo "$city_delta_table"
    fi
  } | tee -a "$TXT_OUT"
fi
