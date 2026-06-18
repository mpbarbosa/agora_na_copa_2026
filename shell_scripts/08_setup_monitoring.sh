#!/bin/bash
#
# 08_setup_monitoring.sh
# -----------------------
# Purpose:      Enable timed nginx access logging for request-duration and
#               client-origin monitoring on the production server.
#
# Usage:        ./shell_scripts/08_setup_monitoring.sh [domain] [port]
#
#   domain  Subdomain the app is served on. Default: copa2026.mpbarbosa.com
#   port    Local port the systemd service listens on. Default: 3001
#
# Prerequisites:
#   - 04_setup_nginx.sh has been run (nginx site config exists).
#   - sudo access.
#
# What it does:
#   1. Writes /etc/nginx/conf.d/10-agora-log-format.conf — defines the
#      `agora_timed` log format that adds $request_time (total nginx latency)
#      and $upstream_response_time (Node.js processing time) to the standard
#      combined fields.
#   2. Injects an `access_log` directive into /etc/nginx/sites-available/<domain>
#      just before the first `location /` block. Idempotent — skips if the
#      format is already configured. Safe to run after certbot (script 05) has
#      modified the config with SSL directives.
#   3. Tests and reloads nginx.
#
# After running:
#   Tail live access logs:
#     tail -f /var/log/nginx/agora-na-copa.access.log
#
#   Check server vitals via the Layer 3 health endpoint:
#     curl -s https://copa2026.mpbarbosa.com/api/health | jq .
#
#   Analyse access patterns with GoAccess (install: sudo apt install goaccess):
#     goaccess /var/log/nginx/agora-na-copa.access.log \
#       --log-format='%h - [%d:%t %z] "%r" %s %b "%R" "%u" rt=%T urt=%^' \
#       --date-format='%d/%b/%Y' --time-format='%H:%M:%S' \
#       -o /tmp/report.html && xdg-open /tmp/report.html
#
# Exit codes:
#   0  Success.
#   1  Prerequisite check or nginx config test failed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/deploy_defaults.sh
source "$SCRIPT_DIR/lib/deploy_defaults.sh"

DOMAIN="${1:-$DEFAULT_APP_DOMAIN}"
PROXY_PORT="${2:-$DEFAULT_APP_PORT}"
CONF_FILE="/etc/nginx/sites-available/${DOMAIN}"
LOG_FORMAT_CONF="/etc/nginx/conf.d/10-agora-log-format.conf"
ACCESS_LOG="/var/log/nginx/agora-na-copa.access.log"

# ── Preflight ─────────────────────────────────────────────────────────────────

if ! sudo test -f "$CONF_FILE"; then
    echo "Error: $CONF_FILE not found. Run 04_setup_nginx.sh first." >&2
    exit 1
fi

# ── 1. Global log-format snippet ──────────────────────────────────────────────

echo "==> Writing log-format snippet: $LOG_FORMAT_CONF (requires sudo)..."
sudo tee "$LOG_FORMAT_CONF" > /dev/null <<'EOF'
# Timed access log format for agora-na-copa-2026.
# Extends the standard "combined" fields with:
#   rt=   total nginx request processing time (seconds, 3-decimal precision)
#   urt=  upstream (Node.js) response time — "-" for static files / cache hits
log_format agora_timed '$remote_addr - [$time_local] '
                       '"$request" $status $body_bytes_sent '
                       '"$http_referer" "$http_user_agent" '
                       'rt=$request_time urt=$upstream_response_time';
EOF

# ── 2. Inject access_log into the existing nginx server block ─────────────────
# Certbot may have rewritten the site config with SSL directives; this uses a
# targeted Python injection rather than overwriting the whole file.

if sudo grep -q "agora_timed" "$CONF_FILE" 2>/dev/null; then
    echo "==> access_log agora_timed already configured in $CONF_FILE — skipping."
else
    echo "==> Injecting access_log directive into $CONF_FILE (requires sudo)..."

    TMPFILE=$(mktemp)
    trap 'rm -f "$TMPFILE"' EXIT

    # Copy the (possibly root-owned) config into a user-writable temp file
    sudo cat "$CONF_FILE" > "$TMPFILE"

    # Insert 'access_log <path> agora_timed;' just before the first
    # 'location /' block, preserving surrounding indentation.
    # Passes the target paths as argv to avoid bash-in-heredoc escaping issues.
    python3 - "$TMPFILE" "$ACCESS_LOG" <<'PYEOF'
import re, sys

conf_path, access_log_path = sys.argv[1], sys.argv[2]

with open(conf_path) as f:
    original = f.read()

# Match the first 'location /' block, capturing its leading whitespace.
# Works on both plain-HTTP and certbot-modified HTTPS configs.
patched = re.sub(
    r'(\n(\s*)location\s+/\s*\{)',
    r'\n\2access_log ' + access_log_path + r' agora_timed;\n\1',
    original,
    count=1,
)

if patched == original:
    print("Warning: could not find 'location /' in the nginx config.", file=sys.stderr)
    print("Add the following line manually inside the server block:", file=sys.stderr)
    print(f"    access_log {access_log_path} agora_timed;", file=sys.stderr)
    # Exit 0 so the script continues to the nginx test/reload step.
    # Manually add the directive if the automated injection missed it.

with open(conf_path, 'w') as f:
    f.write(patched)
PYEOF

    sudo cp "$TMPFILE" "$CONF_FILE"
fi

# ── 3. Validate and reload ─────────────────────────────────────────────────────

echo "==> Testing nginx configuration..."
sudo nginx -t

echo "==> Reloading nginx..."
sudo systemctl reload nginx

echo ""
echo "✓ Timed access logging enabled."
printf "  Log file : %s\n" "$ACCESS_LOG"
echo "  Format   : agora_timed  (fields: ip, time, request, status, bytes, referer, ua, rt=, urt=)"
echo ""
echo "Useful commands:"
printf "  Live tail  : tail -f %s\n" "$ACCESS_LOG"
echo "  GoAccess   : sudo apt install goaccess && \\"
printf "               goaccess %s \\\\\n" "$ACCESS_LOG"
echo "                 --log-format='%h - [%d:%t %z] \"%r\" %s %b \"%R\" \"%u\" rt=%T urt=%^' \\"
echo "                 --date-format='%d/%b/%Y' --time-format='%H:%M:%S' -o /tmp/report.html"
printf "  Health API : curl -s https://%s/api/health | jq .\n" "$DOMAIN"
