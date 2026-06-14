#!/bin/bash
#
# 05_setup_tls.sh
# -----------------
# Purpose:      Obtain and configure a TLS certificate for the
#               agora_na_copa_2026 subdomain via certbot's nginx plugin.
#
# Usage:        CERTBOT_EMAIL=you@example.com ./shell_scripts/05_setup_tls.sh [domain]
#
#   domain  Subdomain to secure. Default: copa2026.mpbarbosa.com
#
# Prerequisites:
#   - 04_setup_nginx.sh has run (HTTP server block already in place).
#   - A DNS A/AAAA record for <domain> points at this host's public IP
#     and has propagated.
#   - sudo access.
#
# What it does:
#   1. Verifies DNS for <domain> resolves before contacting Let's Encrypt.
#   2. Installs certbot + the nginx plugin if not already present.
#   3. Exits cleanly when a valid certificate is already configured in nginx.
#   4. Otherwise runs certbot to obtain or reuse a certificate and configure
#      nginx to listen on 443 with TLS and redirect HTTP to HTTPS.
#
# Exit codes:
#   0  Success.
#   1  Prerequisite check failed or certbot failed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/deploy_defaults.sh
source "$SCRIPT_DIR/lib/deploy_defaults.sh"

DOMAIN="${1:-$DEFAULT_APP_DOMAIN}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
CERT_LIVE_DIR="/etc/letsencrypt/live/${DOMAIN}"
CERT_FULLCHAIN="${CERT_LIVE_DIR}/fullchain.pem"
CERT_PRIVKEY="${CERT_LIVE_DIR}/privkey.pem"

if ! sudo test -f "${NGINX_CONF}"; then
    echo "ERROR: ${NGINX_CONF} does not exist."
    echo "Run ./shell_scripts/04_setup_nginx.sh ${DOMAIN} first."
    exit 1
fi

if ! getent ahosts "${DOMAIN}" >/dev/null 2>&1; then
    echo "ERROR: ${DOMAIN} does not resolve yet."
    echo "Create the DNS A/AAAA record, wait for propagation, and retry."
    exit 1
fi

if ! command -v certbot >/dev/null 2>&1 || ! dpkg -s python3-certbot-nginx >/dev/null 2>&1; then
    echo "==> Installing certbot..."
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
fi

if sudo test -f "${CERT_FULLCHAIN}" \
    && sudo test -f "${CERT_PRIVKEY}" \
    && sudo openssl x509 -checkend 0 -noout -in "${CERT_FULLCHAIN}" >/dev/null 2>&1 \
    && sudo grep -Fq "ssl_certificate ${CERT_FULLCHAIN};" "${NGINX_CONF}" \
    && sudo grep -Fq "ssl_certificate_key ${CERT_PRIVKEY};" "${NGINX_CONF}"; then
    echo "✓ TLS already configured for https://${DOMAIN}"
    exit 0
fi

CERTBOT_ARGS=(
    --nginx
    --redirect
    --keep-until-expiring
    -d "${DOMAIN}"
)

if [[ -n "${CERTBOT_EMAIL}" ]]; then
    CERTBOT_ARGS+=(--non-interactive --agree-tos --email "${CERTBOT_EMAIL}")
fi

echo "==> Ensuring certificate and nginx TLS config for ${DOMAIN}..."
sudo certbot "${CERTBOT_ARGS[@]}"

echo ""
echo "✓ TLS configured for https://${DOMAIN}"
