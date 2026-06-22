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
trap 'rm -f "$TMP_LOG"' EXIT
reader > "$TMP_LOG"

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
} | tee "$TXT_OUT"

echo
echo "Text summary saved to: $TXT_OUT"

# ── Rich GoAccess report (optional) ───────────────────────────────────────────
LOG_FORMAT='%h - [%d:%t %^] "%r" %s %b "%R" "%u" rt=%T urt=%^'
if command -v goaccess >/dev/null 2>&1; then
  HTML_OUT="$OUT_DIR/report-$STAMP.html"
  JSON_OUT="$OUT_DIR/report-$STAMP.json"
  echo "==> GoAccess found — writing $HTML_OUT and $JSON_OUT"
  goaccess "$TMP_LOG" --log-format="$LOG_FORMAT" \
    --date-format='%d/%b/%Y' --time-format='%H:%M:%S' \
    --anonymize-ip --no-query-string -o "$HTML_OUT"
  goaccess "$TMP_LOG" --log-format="$LOG_FORMAT" \
    --date-format='%d/%b/%Y' --time-format='%H:%M:%S' \
    --anonymize-ip --no-query-string -o "$JSON_OUT"
  echo "View HTML: scp ubuntu@<host>:$(pwd)/$HTML_OUT ."
else
  echo
  echo "(GoAccess not installed — text summary only. For the HTML dashboard:"
  echo "   sudo apt-get update && sudo apt-get install -y goaccess"
  echo " then re-run this script.)"
fi
