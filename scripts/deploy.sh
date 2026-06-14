#!/bin/bash
#
# deploy.sh
# ---------
# Purpose:      Run the production preflight, sync the deployable Agora na Copa
#               2026 bundle to the sibling mpbarbosa.com website repository,
#               then commit and push only this project's deployment subtree.
#               On production hosts that already have the live systemd service
#               installed, it also redeploys /var/www/agora_na_copa_2026 so the
#               running site stays in sync with this repository.
#
# Usage:        ./scripts/deploy.sh [-h|--help]
#
# Arguments:
#   -h, --help      Show this help message and exit.
#
# Prerequisites:
#   - mpbarbosa.com repository available at $MPBARBOSA_COM_ROOT
#     (default: auto-detect /var/www/mpbarbosa.com, then
#     $HOME/Documents/GitHub/mpbarbosa.com).
#   - rsync available on PATH.
#   - Node.js and npm installed.
#   - git configured with push access to the mpbarbosa.com remote.
#
# What it does:
#   1. Verifies both the agora_na_copa_2026 and mpbarbosa.com worktrees are clean.
#   2. Fast-forwards the sibling mpbarbosa.com checkout from its remote.
#   3. Runs scripts/deploy-preflight.sh to build and validate dist/.
#   4. Stages the deploy payload required by this app:
#        dist/, package.json, package-lock.json, .env.example
#   5. Rsyncs the staged payload to $MPBARBOSA_COM_ROOT/agora_na_copa_2026/.
#   6. If agora_na_copa_2026/ changed in mpbarbosa.com:
#      a. git add -A -- agora_na_copa_2026
#      b. git commit with the app version and source SHA
#      c. git push
#   7. If this host already runs the live app service, call
#      shell_scripts/06_redeploy.sh to sync /var/www/agora_na_copa_2026.
#
# Environment variables:
#   MPBARBOSA_COM_ROOT   Override the path to the mpbarbosa.com repository.
#                        Default: auto-detect /var/www/mpbarbosa.com, then
#                        $HOME/Documents/GitHub/mpbarbosa.com
#   AGORA_SKIP_LIVE_REDEPLOY
#                        Set to 1 to skip the production-host redeploy step
#                        even if /var/www/agora_na_copa_2026 and the
#                        agora-na-copa-2026 systemd unit are present.
#
# Exit codes:
#   0  Deployment completed successfully (or no subtree changes to push).
#   1  Any step failed (set -euo pipefail).
#
# Related modules: dist/, server.ts, package.json

set -euo pipefail

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MPBARBOSA_COM_ROOT="${MPBARBOSA_COM_ROOT:-}"
DEPLOY_SUBTREE="agora_na_copa_2026"
DEPLOY_TARGET=""
PAYLOAD_STAGE_DIR=""
COMMIT_MESSAGE=""
LIVE_DEPLOY_DIR="/var/www/agora_na_copa_2026"
LIVE_SERVICE_NAME="agora-na-copa-2026"
LIVE_REDEPLOY_SCRIPT="$PROJECT_ROOT/shell_scripts/06_redeploy.sh"

source "$PROJECT_ROOT/shell_scripts/lib/resolve_mpbarbosa_com_root.sh"
source "$PROJECT_ROOT/shell_scripts/lib/stage_deploy_payload.sh"

die() {
    echo "Error: $*" >&2
    exit 1
}

cleanup() {
    if [[ -n "${PAYLOAD_STAGE_DIR:-}" && -d "$PAYLOAD_STAGE_DIR" ]]; then
        rm -rf "$PAYLOAD_STAGE_DIR"
    fi
}

trap cleanup EXIT

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
show_help() {
    cat << 'EOF'
deploy.sh — Build and deploy Agora na Copa 2026 to mpbarbosa.com

USAGE:
    ./scripts/deploy.sh [OPTIONS]

DESCRIPTION:
    Runs the production preflight, syncs the validated deployment payload to the
    sibling mpbarbosa.com repository, and commits + pushes only the
    agora_na_copa_2026 deployment subtree.

OPTIONS:
    -h, --help          Show this help message and exit.

ENVIRONMENT:
    MPBARBOSA_COM_ROOT  Path to the mpbarbosa.com repository.
                        Default: auto-detect /var/www/mpbarbosa.com, then
                        $HOME/Documents/GitHub/mpbarbosa.com
    AGORA_SKIP_LIVE_REDEPLOY
                        Set to 1 to skip the live-app redeploy step.

PROCESS:
    1. Verify this repo worktree is clean
    2. Verify mpbarbosa.com worktree is clean
    3. git pull --ff-only  — fast-forward mpbarbosa.com from remote
    4. deploy-preflight.sh — build + validate dist/
    5. stage payload       — dist/ + package manifests + env example
    6. rsync payload       — sync to $MPBARBOSA_COM_ROOT/agora_na_copa_2026/
    7. git add -A -- agora_na_copa_2026
    8. git commit          — commit with app version + source SHA
    9. git push            — push to remote (skipped if subtree is unchanged)
   10. 06_redeploy.sh      — on production hosts, sync /var/www/agora_na_copa_2026

EXAMPLES:
    ./scripts/deploy.sh
    MPBARBOSA_COM_ROOT=~/Documents/GitHub/mpbarbosa.com ./scripts/deploy.sh
    npm run deploy
EOF
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    show_help
    exit 0
fi

# ---------------------------------------------------------------------------
# Prerequisite checks
# ---------------------------------------------------------------------------
resolve_paths() {
    MPBARBOSA_COM_ROOT="$(resolve_mpbarbosa_com_root "$MPBARBOSA_COM_ROOT")"
    DEPLOY_TARGET="$MPBARBOSA_COM_ROOT/$DEPLOY_SUBTREE"
}

validate_prerequisites() {
    if [ ! -d "$PROJECT_ROOT/.git" ]; then
        die "'$PROJECT_ROOT' is not a git repository."
    fi

    if [ ! -d "$MPBARBOSA_COM_ROOT" ]; then
        die "mpbarbosa.com repository not found at '$MPBARBOSA_COM_ROOT'. Set MPBARBOSA_COM_ROOT or clone the repo."
    fi

    if [ ! -d "$MPBARBOSA_COM_ROOT/.git" ]; then
        die "'$MPBARBOSA_COM_ROOT' is not a git repository."
    fi

    if ! command -v rsync >/dev/null 2>&1; then
        die "rsync is required but was not found on PATH."
    fi

    if ! command -v npm >/dev/null 2>&1; then
        die "npm is required but was not found on PATH."
    fi

    if [ ! -f "$SCRIPT_DIR/deploy-preflight.sh" ]; then
        die "deploy-preflight.sh not found at '$SCRIPT_DIR/deploy-preflight.sh'."
    fi
}

validate_clean_worktrees() {
    echo "==> [1/7] Verifying clean worktrees..."

    if [ -n "$(git -C "$PROJECT_ROOT" status --porcelain)" ]; then
        die "agora_na_copa_2026 worktree is not clean. Commit or stash changes before deploying."
    fi

    if [ -n "$(git -C "$MPBARBOSA_COM_ROOT" status --porcelain)" ]; then
        die "mpbarbosa.com worktree is not clean. Commit or stash changes before deploying."
    fi

    echo "==> Worktrees are clean."
}

prepare_deploy_metadata() {
    local version
    local sha

    version="$(node -p "require('$PROJECT_ROOT/package.json').version")"
    sha="$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)"
    COMMIT_MESSAGE="chore(deploy): publish agora_na_copa_2026 ${version} (${sha})"
}

sync_target_repo() {
    local branch

    echo "==> [2/7] Fast-forwarding $MPBARBOSA_COM_ROOT..."
    branch="$(git -C "$MPBARBOSA_COM_ROOT" rev-parse --abbrev-ref HEAD)"
    if [ "$branch" = "HEAD" ]; then
        die "mpbarbosa.com is in detached HEAD state. Check out a branch before deploying."
    fi

    if ! git -C "$MPBARBOSA_COM_ROOT" rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
        die "mpbarbosa.com branch '$branch' has no upstream configured."
    fi

    git -C "$MPBARBOSA_COM_ROOT" pull --ff-only
    echo "==> Sibling repository is up to date."
}

run_preflight() {
    echo "==> [3/7] Running production preflight..."
    cd "$PROJECT_ROOT"
    "$SCRIPT_DIR/deploy-preflight.sh"
    echo "==> Preflight complete."
}

stage_payload() {
    echo "==> [4/7] Staging deployment payload..."

    PAYLOAD_STAGE_DIR="$(stage_deploy_payload "$PROJECT_ROOT")"

    echo "==> Payload staged at $PAYLOAD_STAGE_DIR."
}

sync_to_target() {
    echo "==> [5/7] Syncing payload to $DEPLOY_TARGET..."
    mkdir -p "$DEPLOY_TARGET"
    rsync -av --delete "$PAYLOAD_STAGE_DIR/" "$DEPLOY_TARGET/"
    echo "==> Sync complete."
}

git_commit_and_push() {
    echo "==> [6/7] Checking for changes in $MPBARBOSA_COM_ROOT/$DEPLOY_SUBTREE..."
    cd "$MPBARBOSA_COM_ROOT"

    echo "==> Staging deployment subtree..."
    git add -A -f -- "$DEPLOY_SUBTREE"

    if git diff --cached --quiet -- "$DEPLOY_SUBTREE"; then
        echo "==> No agora_na_copa_2026 changes to commit. Nothing to push."
        return 0
    fi

    echo "==> Committing deployment..."
    git commit -m "$COMMIT_MESSAGE"

    echo "==> Pushing to remote..."
    git push

    echo "==> Changes pushed successfully."
}

should_redeploy_live_app() {
    if [ "${AGORA_SKIP_LIVE_REDEPLOY:-0}" = "1" ]; then
        return 1
    fi

    if [ ! -f "$LIVE_REDEPLOY_SCRIPT" ]; then
        return 1
    fi

    if [ ! -d "$LIVE_DEPLOY_DIR" ]; then
        return 1
    fi

    if [ ! -f "/etc/systemd/system/${LIVE_SERVICE_NAME}.service" ]; then
        return 1
    fi

    return 0
}

maybe_redeploy_live_app() {
    if [ "${AGORA_SKIP_LIVE_REDEPLOY:-0}" = "1" ]; then
        echo "==> Live app redeploy skipped (AGORA_SKIP_LIVE_REDEPLOY=1)."
        return 0
    fi

    if ! should_redeploy_live_app; then
        echo "==> No live production install detected on this host. Skipping app-directory sync."
        return 0
    fi

    echo "==> [7/7] Syncing live app at $LIVE_DEPLOY_DIR..."
    "$LIVE_REDEPLOY_SCRIPT"
}

main() {
    resolve_paths
    validate_prerequisites
    validate_clean_worktrees
    prepare_deploy_metadata
    sync_target_repo
    run_preflight
    stage_payload
    sync_to_target
    git_commit_and_push
    maybe_redeploy_live_app
    echo ""
    echo "✓ Deployment complete."
}

main
