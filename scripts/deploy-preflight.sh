#!/bin/bash
#
# deploy-preflight.sh
# -------------------
# Purpose:      Run a production deployment pre-flight checklist to verify the
#               build is complete and the deploy payload is ready to sync.
#
# Usage:        ./scripts/deploy-preflight.sh
#
# What it does:
#   1. Checks the local Node.js version and warns if it is older than v20.
#   2. Runs "npm run build"; exits 1 if build fails.
#   3. Verifies dist/index.html exists.
#   4. Verifies dist/server.cjs exists.
#   5. Verifies dist/assets/ contains bundled JS and CSS files.
#   6. Starts the production server on port 9011 and smoke-tests:
#        GET /                      → HTTP 200
#        GET /assets/<first-js>     → HTTP 200
#   7. Stops the preview server and prints a deployment-ready summary.
#
# Exit codes:
#   0  All checks passed; deploy payload is ready.
#   1  Any check failed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PREVIEW_PORT=9011
PREVIEW_LOG="/tmp/agora-na-copa-preflight.log"
PREVIEW_PID=""

cleanup() {
    if [[ -n "${PREVIEW_PID:-}" ]] && kill -0 "$PREVIEW_PID" >/dev/null 2>&1; then
        kill "$PREVIEW_PID" >/dev/null 2>&1 || true
        wait "$PREVIEW_PID" 2>/dev/null || true
    fi
}

trap cleanup EXIT

cd "$PROJECT_ROOT"

echo "🚀 Production Deployment Pre-flight Checklist"
echo "=============================================="
echo ""

echo "✓ Checking Node.js version..."
NODE_VERSION="$(node --version)"
if node -e "const [major] = process.versions.node.split('.').map(Number); process.exit(major >= 20 ? 0 : 1)"; then
    echo "  ✅ Node.js version compatible ($NODE_VERSION)"
else
    echo "  ⚠️  Node.js version $NODE_VERSION (recommend v20+)"
fi

echo ""
echo "✓ Building production bundle..."
if ! npm run build > /dev/null 2>&1; then
    echo "  ❌ Build failed"
    exit 1
fi
echo "  ✅ Build succeeded"

echo ""
echo "✓ Verifying critical files in dist/..."

if [ -f "dist/index.html" ]; then
    echo "  ✅ index.html exists"
else
    echo "  ❌ index.html missing"
    exit 1
fi

if [ -f "dist/server.cjs" ]; then
    echo "  ✅ server.cjs exists"
else
    echo "  ❌ server.cjs missing"
    exit 1
fi

if [ -d "dist/assets" ]; then
    JS_COUNT="$(find dist/assets -name "*.js" | wc -l | tr -d ' ')"
    CSS_COUNT="$(find dist/assets -name "*.css" | wc -l | tr -d ' ')"
    if [ "$JS_COUNT" -gt 0 ] && [ "$CSS_COUNT" -gt 0 ]; then
        echo "  ✅ assets/ directory exists ($JS_COUNT JS files, $CSS_COUNT CSS files)"
    else
        echo "  ❌ assets/ directory is missing JS or CSS bundles"
        exit 1
    fi
else
    echo "  ❌ assets/ directory missing"
    exit 1
fi

FIRST_JS_ASSET="$(find dist/assets -name "*.js" | sort | head -n 1)"
FIRST_JS_ROUTE="/${FIRST_JS_ASSET#dist/}"

echo ""
echo "✓ Testing production server locally..."
echo "  Starting production server on port $PREVIEW_PORT..."
PORT="$PREVIEW_PORT" NODE_ENV=production npm start > "$PREVIEW_LOG" 2>&1 &
PREVIEW_PID=$!

sleep 3

if ! kill -0 "$PREVIEW_PID" >/dev/null 2>&1; then
    echo "  ❌ Production server failed to start"
    echo "  See log: $PREVIEW_LOG"
    exit 1
fi

echo "  Testing critical endpoints..."
if curl -fsSI "http://localhost:$PREVIEW_PORT/" >/dev/null; then
    echo "    ✅ Main page accessible"
else
    echo "    ❌ Main page not accessible"
    echo "    See log: $PREVIEW_LOG"
    exit 1
fi

if curl -fsSI "http://localhost:$PREVIEW_PORT$FIRST_JS_ROUTE" >/dev/null; then
    echo "    ✅ Built JS asset accessible"
else
    echo "    ❌ Built JS asset not accessible"
    echo "    Route tested: $FIRST_JS_ROUTE"
    echo "    See log: $PREVIEW_LOG"
    exit 1
fi

echo ""
echo "=============================================="
echo "✅ All pre-flight checks passed!"
echo ""
echo "📦 Ready to deploy Agora na Copa 2026 payload"
echo ""
echo "Included in deploy payload:"
echo "  • dist/"
echo "  • package.json"
echo "  • package-lock.json"
echo "  • .env.example"
