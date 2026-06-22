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
#   2. GUARD: rolls out only when the live site is behind the payload. Compares
#      the payload's package.json version against the running service's
#      /api/health version and exits early (success) when production is already
#      current — avoiding a needless service restart + cache reset. Fail-open:
#      if either version can't be read, it proceeds with the rollout.
#   3. Pins AGORA_STAGING_DIR to the prebuilt payload and runs 06_redeploy.sh,
#      which then rsyncs it to /var/www, runs `npm ci --omit=dev`, and restarts
#      the service — with NO vite/esbuild build on this host.
#
# Environment variables:
#   AGORA_FORCE_GO_LIVE  Set to 1 to roll out regardless of versions (e.g. to
#                        redeploy the same version after a config/.env change).
#   AGORA_HEALTH_URL     Override the live health endpoint used for the version
#                        check. Default: http://127.0.0.1:$DEFAULT_APP_PORT/api/health
#
# Exit codes:
#   0  Success (rolled out, OR already current and skipped).
#   1  Missing mpbarbosa.com checkout or prebuilt payload.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_SUBTREE="$(basename "$PROJECT_ROOT")"

source "$SCRIPT_DIR/lib/resolve_mpbarbosa_com_root.sh"
source "$SCRIPT_DIR/lib/deploy_defaults.sh"

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

# ---------------------------------------------------------------------------
# Guard: roll out ONLY when the live site is behind the payload.
# Compares the to-be-deployed payload version against the running service's
# /api/health version, and skips a redundant redeploy (which restarts the
# service and resets in-memory caches) when production is already current.
# Fail-open: if either version can't be read, proceed with the rollout rather
# than silently skipping a needed deploy. Override with AGORA_FORCE_GO_LIVE=1.
# ---------------------------------------------------------------------------
HEALTH_URL="${AGORA_HEALTH_URL:-http://127.0.0.1:${DEFAULT_APP_PORT}/api/health}"

# Extracts the first `"version": "X.Y.Z"` value from stdin (no jq/node needed).
read_version_field() {
    grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed -E 's/.*"([^"]+)"$/\1/'
}

# True when $1 is a strictly higher semver than $2.
version_gt() {
    [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -n1)" = "$1" ]
}

PAYLOAD_VER="$(read_version_field < "$PAYLOAD_DIR/package.json" || true)"
LIVE_VER="$(curl -fsS --max-time 5 "$HEALTH_URL" 2>/dev/null | read_version_field || true)"

if [ "${AGORA_FORCE_GO_LIVE:-}" = "1" ]; then
    echo "==> AGORA_FORCE_GO_LIVE=1 — rolling out regardless of versions."
elif [ -z "$LIVE_VER" ]; then
    echo "==> Live version unknown (could not reach $HEALTH_URL) — proceeding with rollout."
elif [ -z "$PAYLOAD_VER" ]; then
    echo "==> Payload version unknown — proceeding with rollout."
elif version_gt "$PAYLOAD_VER" "$LIVE_VER"; then
    echo "==> Live is behind (live $LIVE_VER < payload $PAYLOAD_VER) — rolling out."
else
    echo "✓ Production already current (live $LIVE_VER ≥ payload $PAYLOAD_VER) — nothing to roll out."
    echo "  Set AGORA_FORCE_GO_LIVE=1 to redeploy the same version anyway."
    exit 0
fi

echo "==> Rolling out the prebuilt payload (no build on this host)..."
# Pin the staging dir to the prebuilt payload so 06_redeploy.sh consumes it
# directly and never falls back to rebuilding PROJECT_ROOT.
export AGORA_STAGING_DIR="$PAYLOAD_DIR"
"$SCRIPT_DIR/06_redeploy.sh"

echo ""
echo "✓ Build-free go-live complete — no vite/esbuild ran on this host."
