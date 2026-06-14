#!/bin/bash
#
# 04_setup_nginx.sh
# ------------------
# Purpose:      Configure an nginx server block that reverse-proxies a
#               subdomain to the agora_na_copa_2026 systemd service.
#               A subdomain is used (rather than a /agora_na_copa_2026/
#               subpath on the main site) because the Vite build has no
#               `base` path configured and its assets reference absolute
#               root paths.
#
# Usage:        ./shell_scripts/04_setup_nginx.sh [domain] [port]
#
#   domain  Subdomain to serve the app on. Default: agora.mpbarbosa.com
#   port    Local port the systemd service listens on. Default: 3001
#
# Prerequisites:
#   - sudo access.
#   - nginx installed.
#   - 03_install_systemd_service.sh has run and the service is listening
#     on the given port.
#
# What it does:
#   1. Writes /etc/nginx/sites-available/<domain> with a reverse-proxy
#      server block listening on port 80.
#   2. Symlinks it into /etc/nginx/sites-enabled/.
#   3. Validates the nginx config and reloads nginx.
#
# Note:
#   This sets up plain HTTP only. Run 05_setup_tls.sh afterwards to add
#   HTTPS via certbot once DNS for <domain> resolves to this host.
#
# Exit codes:
#   0  Success.
#   1  nginx config test failed.

set -euo pipefail

DOMAIN="${1:-agora.mpbarbosa.com}"
PROXY_PORT="${2:-3001}"
CONF_FILE="/etc/nginx/sites-available/${DOMAIN}"

echo "==> Writing $CONF_FILE (requires sudo)..."
sudo tee "$CONF_FILE" > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${PROXY_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo "==> Enabling site..."
sudo ln -sf "$CONF_FILE" "/etc/nginx/sites-enabled/${DOMAIN}"

echo "==> Testing nginx configuration..."
sudo nginx -t

echo "==> Reloading nginx..."
sudo systemctl reload nginx

echo ""
echo "✓ nginx configured: http://${DOMAIN} -> 127.0.0.1:${PROXY_PORT}"
