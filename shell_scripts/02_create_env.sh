#!/bin/bash
#
# 02_create_env.sh
# -----------------
# Purpose:      Interactively create the real production .env file for
#               agora_na_copa_2026. This file is never synced from the
#               mpbarbosa.com staging repo (which only carries
#               .env.example with placeholder values).
#
# Usage:        ./shell_scripts/02_create_env.sh
#
# What it does:
#   1. Refuses to run if /var/www/agora_na_copa_2026/.env already exists,
#      to avoid accidentally overwriting real secrets.
#   2. Prompts for GEMINI_API_KEY, APP_URL and PORT.
#   3. Writes /var/www/agora_na_copa_2026/.env with mode 600.
#
# Exit codes:
#   0  Success.
#   1  .env already exists, or deploy directory missing.

set -euo pipefail

DEPLOY_DIR="/var/www/agora_na_copa_2026"
ENV_FILE="$DEPLOY_DIR/.env"

if [ ! -d "$DEPLOY_DIR" ]; then
    echo "Error: $DEPLOY_DIR not found. Run 01_setup_app_directory.sh first." >&2
    exit 1
fi

if [ -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE already exists." >&2
    echo "Remove it manually first if you really want to recreate it." >&2
    exit 1
fi

read -rp "GEMINI_API_KEY: " GEMINI_API_KEY
if [ -z "$GEMINI_API_KEY" ]; then
    echo "Error: GEMINI_API_KEY cannot be empty." >&2
    exit 1
fi

read -rp "APP_URL [https://agora.mpbarbosa.com]: " APP_URL
APP_URL="${APP_URL:-https://agora.mpbarbosa.com}"

read -rp "PORT [3001]: " PORT
PORT="${PORT:-3001}"

cat > "$ENV_FILE" <<EOF
GEMINI_API_KEY=$GEMINI_API_KEY
APP_URL=$APP_URL
NODE_ENV=production
PORT=$PORT
EOF

chmod 600 "$ENV_FILE"

echo ""
echo "✓ Wrote $ENV_FILE (mode 600)"
