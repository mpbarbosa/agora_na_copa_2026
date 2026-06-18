#!/usr/bin/env bash
# Run all test suites (lint, unit, e2e) inside the Docker test image.
#
# Usage:
#   ./scripts/docker-test.sh              # build image + run all suites
#   ./scripts/docker-test.sh --no-build   # skip build (reuse existing image)
set -euo pipefail

IMAGE="agora-na-copa-tests"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD=true

for arg in "$@"; do
  case "$arg" in
    --no-build) BUILD=false ;;
    *) printf 'Unknown argument: %s\n' "$arg" >&2; exit 1 ;;
  esac
done

# ── output helpers ────────────────────────────────────────────────────────────
hr()   { printf '\n\033[1;34m══ %s ══\033[0m\n\n' "$1"; }
pass() { printf '\033[0;32m✓  %s\033[0m\n' "$1"; }
fail() { printf '\033[0;31m✗  %s\033[0m\n' "$1" >&2; }

# ── preflight ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  fail "Docker not found — install Docker Desktop or Docker Engine first."
  exit 1
fi

START=$(date +%s)

# ── build image ───────────────────────────────────────────────────────────────
if [[ "$BUILD" == true ]]; then
  hr "Building test image ($IMAGE)"
  docker build -f "$ROOT/Dockerfile.test" -t "$IMAGE" "$ROOT"
else
  printf 'Skipping build — using existing image %s\n' "$IMAGE"
fi

# ── suite runner ─────────────────────────────────────────────────────────────
RESULTS=()

run_suite() {
  local name="$1"
  local cmd="$2"
  hr "$name"
  if docker run --rm "$IMAGE" bash -c "$cmd"; then
    pass "$name passed"
    RESULTS+=("PASS:$name")
  else
    fail "$name failed"
    RESULTS+=("FAIL:$name")
  fi
}

# ── suites ────────────────────────────────────────────────────────────────────
run_suite "Type check (lint)" \
  "npm run lint"

run_suite "Unit tests" \
  "npm run test:unit"

# Resolve the Playwright-managed Chromium path inside the container at runtime,
# matching the technique used in ci.yml (CJS node -e is independent of package
# "type": "module").
run_suite "End-to-end tests" \
  'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=$(node -e "const {chromium}=require(\"playwright-core\");process.stdout.write(chromium.executablePath())") npm run test:e2e'

# ── summary ───────────────────────────────────────────────────────────────────
ELAPSED=$(( $(date +%s) - START ))
hr "Summary  (${ELAPSED}s)"

FAILED=0
for result in "${RESULTS[@]}"; do
  name="${result#*:}"
  if [[ "$result" == FAIL:* ]]; then
    fail "$name"
    FAILED=$(( FAILED + 1 ))
  else
    pass "$name"
  fi
done

echo
if [[ $FAILED -gt 0 ]]; then
  fail "$FAILED suite(s) failed"
  exit 1
else
  pass "All suites passed"
fi
