#!/bin/bash
#
# 01_setup_app_directory.sh
# --------------------------
# Purpose:      Create the production application directory for
#               agora_na_copa_2026, sync the validated build payload from
#               the mpbarbosa.com staging repo into it, and install
#               production dependencies.
#
# Usage:        ./shell_scripts/01_setup_app_directory.sh
#
# Prerequisites:
#   - agora_na_copa_2026/scripts/deploy.sh has already run, so
#     mpbarbosa.com/agora_na_copa_2026/ contains a validated dist/ build.
#   - sudo access (only needed the first time, to create /var/www/...).
#
# What it does:
#   1. Creates /var/www/agora_na_copa_2026 (if missing) and chowns it to
#      the current user so subsequent runs need no sudo.
#   2. Rsyncs the staged payload (dist/, package.json, package-lock.json,
#      .env.example) into /var/www/agora_na_copa_2026, preserving any
#      existing .env.
#   3. Installs production dependencies with npm ci --omit=dev.
#
# Exit codes:
#   0  Success.
#   1  Staging payload missing or npm install failed.

set -euo pipefail

DEPLOY_DIR="/var/www/agora_na_copa_2026"
STAGING_DIR="$HOME/Documents/GitHub/mpbarbosa.com/agora_na_copa_2026"

if [ ! -d "$STAGING_DIR/dist" ]; then
    echo "Error: staging payload not found at $STAGING_DIR/dist" >&2
    echo "Run agora_na_copa_2026/scripts/deploy.sh first." >&2
    exit 1
fi

if [ ! -d "$DEPLOY_DIR" ]; then
    echo "==> Creating $DEPLOY_DIR (requires sudo)..."
    sudo mkdir -p "$DEPLOY_DIR"
    sudo chown -R "$(id -un):$(id -gn)" "$DEPLOY_DIR"
fi

echo "==> Syncing build payload from staging..."
rsync -av --delete --exclude ".env" "$STAGING_DIR/" "$DEPLOY_DIR/"

echo "==> Installing production dependencies..."
cd "$DEPLOY_DIR"
npm ci --omit=dev

echo ""
echo "✓ App directory ready at $DEPLOY_DIR"
