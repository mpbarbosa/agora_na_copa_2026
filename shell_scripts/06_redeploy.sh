#!/bin/bash
#
# 06_redeploy.sh
# ---------------
# Purpose:      Roll out a new build of agora_na_copa_2026 to the running
#               production service using the latest validated staging payload.
#
# Usage:        ./shell_scripts/06_redeploy.sh
#
# Prerequisites:
#   - 01-04 have already been run once (app directory, .env, systemd
#     service and nginx are already set up).
#   - Either:
#     a. mpbarbosa.com/agora_na_copa_2026 contains an updated dist/ build
#        (i.e. agora_na_copa_2026/scripts/deploy.sh ran successfully), or
#     b. this repository already contains a fresh local dist/ build.
#   - sudo access (to restart the systemd service).
#
# What it does:
#   1. Resolves the newest available staging payload.
#   2. If it falls back to the local repository payload, runs the deployment
#      preflight to rebuild and validate dist/ before syncing.
#   3. Rsyncs the latest staged payload into /var/www/agora_na_copa_2026,
#      preserving the existing .env.
#   4. Reinstalls production dependencies (in case package.json changed).
#   5. Restarts the agora-na-copa-2026 systemd service.
#   6. Prints its status.
#
# Exit codes:
#   0  Success.
#   1  Staging payload missing or restart failed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_DIR="/var/www/agora_na_copa_2026"
DEPLOY_SUBTREE="$(basename "$PROJECT_ROOT")"
SERVICE_NAME="agora-na-copa-2026"
PAYLOAD_STAGE_DIR=""

source "$SCRIPT_DIR/lib/resolve_staging_dir.sh"
source "$SCRIPT_DIR/lib/stage_deploy_payload.sh"

cleanup() {
    if [[ -n "${PAYLOAD_STAGE_DIR:-}" && -d "$PAYLOAD_STAGE_DIR" ]]; then
        rm -rf "$PAYLOAD_STAGE_DIR"
    fi
}

trap cleanup EXIT

STAGING_DIR="$(resolve_staging_dir "$PROJECT_ROOT" "$DEPLOY_SUBTREE")"

if [ ! -d "$DEPLOY_DIR" ]; then
    echo "Error: $DEPLOY_DIR not found. Run 01_setup_app_directory.sh first." >&2
    exit 1
fi

if [ "$STAGING_DIR" = "$PROJECT_ROOT" ]; then
    echo "==> Local project selected as staging payload; rebuilding and validating dist/..."
    "$PROJECT_ROOT/scripts/deploy-preflight.sh"
fi

PAYLOAD_STAGE_DIR="$(stage_deploy_payload "$STAGING_DIR")"

echo "==> Syncing latest build from $STAGING_DIR to $DEPLOY_DIR..."
rsync -av --delete --exclude ".env" "$PAYLOAD_STAGE_DIR/" "$DEPLOY_DIR/"

echo "==> Installing production dependencies..."
cd "$DEPLOY_DIR"
npm ci --omit=dev

echo "==> Restarting ${SERVICE_NAME}..."
sudo systemctl restart "$SERVICE_NAME"

echo ""
sudo systemctl status "$SERVICE_NAME" --no-pager
