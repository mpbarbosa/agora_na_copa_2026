#!/bin/bash
#
# 06_redeploy.sh
# ---------------
# Purpose:      Roll out a new build of agora_na_copa_2026 to the running
#               production service. Use this after
#               scripts/deploy.sh has refreshed mpbarbosa.com/agora_na_copa_2026/.
#
# Usage:        ./shell_scripts/06_redeploy.sh
#
# Prerequisites:
#   - 01-04 have already been run once (app directory, .env, systemd
#     service and nginx are already set up).
#   - mpbarbosa.com/agora_na_copa_2026/ contains an updated dist/ build
#     (i.e. agora_na_copa_2026/scripts/deploy.sh ran successfully).
#   - sudo access (to restart the systemd service).
#
# What it does:
#   1. Rsyncs the latest staged payload into /var/www/agora_na_copa_2026,
#      preserving the existing .env.
#   2. Reinstalls production dependencies (in case package.json changed).
#   3. Restarts the agora-na-copa-2026 systemd service.
#   4. Prints its status.
#
# Exit codes:
#   0  Success.
#   1  Staging payload missing or restart failed.

set -euo pipefail

DEPLOY_DIR="/var/www/agora_na_copa_2026"
STAGING_DIR="$HOME/Documents/GitHub/mpbarbosa.com/agora_na_copa_2026"
SERVICE_NAME="agora-na-copa-2026"

if [ ! -d "$STAGING_DIR/dist" ]; then
    echo "Error: staging payload not found at $STAGING_DIR/dist" >&2
    echo "Run agora_na_copa_2026/scripts/deploy.sh first." >&2
    exit 1
fi

if [ ! -d "$DEPLOY_DIR" ]; then
    echo "Error: $DEPLOY_DIR not found. Run 01_setup_app_directory.sh first." >&2
    exit 1
fi

echo "==> Syncing latest build to $DEPLOY_DIR..."
rsync -av --delete --exclude ".env" "$STAGING_DIR/" "$DEPLOY_DIR/"

echo "==> Installing production dependencies..."
cd "$DEPLOY_DIR"
npm ci --omit=dev

echo "==> Restarting ${SERVICE_NAME}..."
sudo systemctl restart "$SERVICE_NAME"

echo ""
sudo systemctl status "$SERVICE_NAME" --no-pager
