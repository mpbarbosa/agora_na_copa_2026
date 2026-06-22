#!/usr/bin/env bash
#
# traffic-report.sh — Phase 0 traffic baseline for "Agora na Copa 26".
#
# Parses the nginx access log with GoAccess to produce a visitor baseline:
# pageviews, unique visitors, top requested views, referrers, bot share,
# geography, and request timings. See docs/monetization/PLAN.md (Phase 0).
#
# Run this ON THE PRODUCTION HOST (the log is root-owned there), e.g.:
#   bash scripts/traffic-report.sh
# or pipe over SSH from your laptop:
#   ssh <host> 'sudo zcat -f /var/log/nginx/agora-na-copa.access.log*' \
#     | goaccess - --log-format='<see LOG_FORMAT below>' \
#         --date-format='%d/%b/%Y' --time-format='%H:%M:%S' -o report.html
#
# Output: an HTML report and a JSON dump in ./traffic-reports/ (gitignored).
#
# The log_format this matches is defined in
# shell_scripts/08_setup_monitoring.sh ("agora_timed"):
#   $remote_addr - [$time_local] "$request" $status $body_bytes_sent
#   "$http_referer" "$http_user_agent" rt=$request_time urt=$upstream_response_time

set -euo pipefail

ACCESS_LOG="${1:-/var/log/nginx/agora-na-copa.access.log}"
OUT_DIR="${2:-traffic-reports}"

# GoAccess format string matching the "agora_timed" nginx log_format.
#   %h  remote_addr        " - "  literal (no remote_user field)
#   [%d:%t %^]             [time_local]  (date:time<space>+zzzz)
#   "%r"  request          %s status     %b body_bytes_sent
#   "%R"  referer          "%u" user-agent
#   rt=%T  request_time    urt=%^  upstream_response_time (ignored)
LOG_FORMAT='%h - [%d:%t %^] "%r" %s %b "%R" "%u" rt=%T urt=%^'
DATE_FORMAT='%d/%b/%Y'
TIME_FORMAT='%H:%M:%S'

if ! command -v goaccess >/dev/null 2>&1; then
  echo "GoAccess is not installed. On the Ubuntu host:" >&2
  echo "  sudo apt-get update && sudo apt-get install -y goaccess" >&2
  exit 127
fi

# Use sudo only if the log is not readable as the current user.
READER=(zcat -f)
if [[ ! -r "$ACCESS_LOG" ]]; then
  READER=(sudo zcat -f)
fi

mkdir -p "$OUT_DIR"
HTML_OUT="$OUT_DIR/report.html"
JSON_OUT="$OUT_DIR/report.json"

# zcat -f streams plain + rotated (.1) + gzipped (.2.gz, …) logs together so the
# baseline spans the whole retained window, not just the current file.
echo "==> Generating HTML report -> $HTML_OUT"
"${READER[@]}" "$ACCESS_LOG"* \
  | goaccess - \
      --log-format="$LOG_FORMAT" \
      --date-format="$DATE_FORMAT" \
      --time-format="$TIME_FORMAT" \
      --anonymize-ip \
      --no-query-string \
      -o "$HTML_OUT"

echo "==> Generating JSON dump  -> $JSON_OUT"
"${READER[@]}" "$ACCESS_LOG"* \
  | goaccess - \
      --log-format="$LOG_FORMAT" \
      --date-format="$DATE_FORMAT" \
      --time-format="$TIME_FORMAT" \
      --anonymize-ip \
      --no-query-string \
      -o "$JSON_OUT"

echo
echo "Done. Open $HTML_OUT in a browser, or copy it locally:"
echo "  scp <host>:$(pwd)/$HTML_OUT ."
