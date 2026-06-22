#!/bin/bash
#
# 10_go_live.sh
# -------------
# Purpose:      BUILD-FREE production go-live. Rolls out the prebuilt payload that
#               `npm run deploy` (run on the DEV machine) published into the
#               mpbarbosa.com repo — WITHOUT running vite/esbuild on the prod box.
#               Use this on the production host INSTEAD of `npm run deploy`, which
#               rebuilds locally and can OOM-thrash the ~1.9 GiB host.
#               See devops/copa_2026/EC2_CAPACITY_DEPLOY_SAFETY_ROADMAP.md (Phase 2).
#
# Usage:        On the production host:
#                 cd ~/Documents/GitHub/agora_na_copa_2026 && git pull
#                 npm run go-live        # or: bash shell_scripts/10_go_live.sh
#
# Prerequisites:
#   - The mpbarbosa.com repo is checked out on this host (resolve order:
#     /var/www/mpbarbosa.com, then ~/Documents/GitHub/mpbarbosa.com). One-time:
#       git clone https://github.com/mpbarbosa/mpbarbosa.com.git ~/Documents/GitHub/mpbarbosa.com
#   - DEV has already run `npm run deploy` to publish a fresh prebuilt dist/ there.
#   - sudo access (06_redeploy.sh restarts the systemd service).
#
# What it does:
#   1. Pulls the latest prebuilt payload into the local mpbarbosa.com checkout.
#   2. Pins AGORA_STAGING_DIR to that prebuilt payload and runs 06_redeploy.sh,
#      which then rsyncs it to /var/www, runs `npm ci --omit=dev`, and restarts
#      the service — with NO vite/esbuild build on this host.
#
# Exit codes:
#   0  Success.   1  Missing mpbarbosa.com checkout or prebuilt payload.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_SUBTREE="$(basename "$PROJECT_ROOT")"

source "$SCRIPT_DIR/lib/resolve_mpbarbosa_com_root.sh"

if ! MPBARBOSA_ROOT="$(resolve_mpbarbosa_com_root)"; then
    echo "Hint: clone the deploy repo once on this host, e.g.:" >&2
    echo "  git clone https://github.com/mpbarbosa/mpbarbosa.com.git ~/Documents/GitHub/mpbarbosa.com" >&2
    exit 1
fi

PAYLOAD_DIR="$MPBARBOSA_ROOT/$DEPLOY_SUBTREE"

echo "==> Pulling the prebuilt payload into $MPBARBOSA_ROOT ..."
git -C "$MPBARBOSA_ROOT" pull --ff-only

if [ ! -d "$PAYLOAD_DIR/dist" ]; then
    echo "Error: no prebuilt dist/ at $PAYLOAD_DIR." >&2
    echo "Run 'npm run deploy' on the DEV machine first to publish a build." >&2
    exit 1
fi

echo "==> Rolling out the prebuilt payload (no build on this host)..."
# Pin the staging dir to the prebuilt payload so 06_redeploy.sh consumes it
# directly and never falls back to rebuilding PROJECT_ROOT.
export AGORA_STAGING_DIR="$PAYLOAD_DIR"
"$SCRIPT_DIR/06_redeploy.sh"

echo ""
echo "✓ Build-free go-live complete — no vite/esbuild ran on this host."
