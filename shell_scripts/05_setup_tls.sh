#!/bin/bash
#
# 05_setup_tls.sh
# -----------------
# Purpose:      Obtain and configure a TLS certificate for the
#               agora_na_copa_2026 subdomain via certbot's nginx plugin.
#
# Usage:        ./shell_scripts/05_setup_tls.sh [domain]
#
#   domain  Subdomain to secure. Default: agora.mpbarbosa.com
#
# Prerequisites:
#   - 04_setup_nginx.sh has run (HTTP server block already in place).
#   - A DNS A/AAAA record for <domain> points at this host's public IP
#     and has propagated.
#   - sudo access.
#
# What it does:
#   1. Pauses for confirmation that DNS for <domain> resolves correctly.
#   2. Installs certbot + the nginx plugin if not already present.
#   3. Runs `certbot --nginx -d <domain>`, which obtains a certificate
#      and updates the nginx server block to listen on 443 with TLS and
#      redirect HTTP to HTTPS.
#
# Exit codes:
#   0  Success.
#   1  Aborted or certbot failed.

set -euo pipefail

DOMAIN="${1:-agora.mpbarbosa.com}"

echo "Before continuing:"
echo "  1. Create a DNS A/AAAA record for ${DOMAIN} pointing at this host's public IP."
echo "  2. Verify it resolves, e.g.: dig +short ${DOMAIN}"
echo ""
read -rp "Press Enter once DNS is confirmed, or Ctrl+C to abort..."

if ! command -v certbot >/dev/null 2>&1; then
    echo "==> Installing certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
fi

echo "==> Requesting certificate for ${DOMAIN}..."
sudo certbot --nginx -d "${DOMAIN}"

echo ""
echo "✓ TLS configured for https://${DOMAIN}"
