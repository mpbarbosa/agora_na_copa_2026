#!/bin/bash
#
# 01_setup_app_directory.sh
# --------------------------
# Purpose:      Create the production application directory for
#               agora_na_copa_2026, sync a validated build payload into it,
#               and install production dependencies.
#
# Usage:        ./shell_scripts/01_setup_app_directory.sh
#
# Prerequisites:
#   - Either:
#     a. agora_na_copa_2026/scripts/deploy.sh has already run, so
#        mpbarbosa.com/agora_na_copa_2026/ contains a validated dist/ build, or
#     b. this repository already contains a fresh local dist/ build.
#   - sudo access (needed on any run that must repair /var/www/... ownership).
#
# What it does:
#   1. Resolves the newest available staging payload.
#   2. If it falls back to the local repository payload, runs the deployment
#      preflight to rebuild and validate dist/ before syncing.
#   3. Ensures /var/www/agora_na_copa_2026 exists and is owned by the current
#      user before syncing files into it.
#   4. Rsyncs only the deploy payload (dist/, package.json, package-lock.json,
#      .env.example) into /var/www/agora_na_copa_2026, preserving any
#      existing .env.
#   5. Installs production dependencies with npm ci --omit=dev.
#
# Exit codes:
#   0  Success.
#   1  Staging payload missing or npm install failed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_DIR="/var/www/agora_na_copa_2026"
DEPLOY_SUBTREE="$(basename "$PROJECT_ROOT")"
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

if [ "$STAGING_DIR" = "$PROJECT_ROOT" ]; then
    echo "==> Local project selected as staging payload; rebuilding and validating dist/..."
    "$PROJECT_ROOT/scripts/deploy-preflight.sh"
fi

PAYLOAD_STAGE_DIR="$(stage_deploy_payload "$STAGING_DIR")"

if [ ! -d "$DEPLOY_DIR" ]; then
    echo "==> Creating $DEPLOY_DIR (requires sudo)..."
    sudo mkdir -p "$DEPLOY_DIR"
fi

if [ ! -w "$DEPLOY_DIR" ] || [ "$(stat -c '%U:%G' "$DEPLOY_DIR")" != "$(id -un):$(id -gn)" ]; then
    echo "==> Repairing ownership for $DEPLOY_DIR (requires sudo)..."
    sudo chown -R "$(id -un):$(id -gn)" "$DEPLOY_DIR"
fi

echo "==> Syncing build payload from $STAGING_DIR..."
rsync -av --delete --exclude ".env" "$PAYLOAD_STAGE_DIR/" "$DEPLOY_DIR/"

echo "==> Installing production dependencies..."
cd "$DEPLOY_DIR"
npm ci --omit=dev

echo ""
echo "✓ App directory ready at $DEPLOY_DIR"
