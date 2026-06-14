#!/bin/bash
#
# 07_add_portfolio_link.sh
# --------------------------
# Purpose:      Add an "Agora na Copa 2026" entry to the project list on
#               both the Portuguese and English landing pages of
#               mpbarbosa_site, linking to the deployed subdomain.
#
# Usage:        ./shell_scripts/07_add_portfolio_link.sh [url]
#
#   url  Public URL of the deployed app. Default: https://copa2026.mpbarbosa.com
#
# Prerequisites:
#   - mpbarbosa_site checked out at ~/Documents/GitHub/mpbarbosa_site.
#   - The app has been deployed and is reachable at <url>
#     (steps 01-05/06).
#
# What it does:
#   1. Inserts a new <li> entry (with a .project-desc line, matching the
#      existing project list style) just before the closing </ul> of
#      .project-list in src/index.html (PT) and src/en/index.html (EN).
#   2. Skips a file if it already contains the link (idempotent).
#
# After running:
#   - Review the diff with `git -C ~/Documents/GitHub/mpbarbosa_site diff`.
#   - Bump the app version and commit/push/sync as usual.
#
# Exit codes:
#   0  Success (including no-op if already present).
#   1  Target file not found.

set -euo pipefail

SITE_REPO="$HOME/Documents/GitHub/mpbarbosa_site"
APP_URL="${1:-https://copa2026.mpbarbosa.com}"

PT_FILE="$SITE_REPO/src/index.html"
EN_FILE="$SITE_REPO/src/en/index.html"

insert_li() {
    local file="$1"
    local snippet_file="$2"

    if [ ! -f "$file" ]; then
        echo "Error: $file not found." >&2
        exit 1
    fi

    if grep -q "agora.mpbarbosa.com\|Agora na Copa" "$file"; then
        echo "==> $file already references Agora na Copa 2026, skipping."
        return 0
    fi

    awk -v snippet="$(cat "$snippet_file")" '
        /class="project-list"/ { in_list = 1 }
        in_list && /<\/ul>/ && !inserted {
            print snippet
            inserted = 1
        }
        { print }
    ' "$file" > "$file.tmp"
    mv "$file.tmp" "$file"

    echo "==> Inserted Agora na Copa 2026 entry into $file"
}

PT_SNIPPET="$(mktemp)"
EN_SNIPPET="$(mktemp)"
trap 'rm -f "$PT_SNIPPET" "$EN_SNIPPET"' EXIT

cat > "$PT_SNIPPET" <<EOF
            <li>
              <a href="${APP_URL}" target="_blank" rel="noopener noreferrer"
                >Agora na Copa 2026</a
              >
              — Acompanhamento da Copa do Mundo 2026
              <p class="project-desc">
                Previsões e análises de partidas da Copa do Mundo 2026 geradas por IA, com chat
                tático interativo.
              </p>
            </li>
EOF

cat > "$EN_SNIPPET" <<EOF
            <li>
              <a href="${APP_URL}" target="_blank" rel="noopener noreferrer"
                >Agora na Copa 2026</a
              >
              — World Cup 2026 companion
              <p class="project-desc">
                AI-generated match predictions and analysis for the 2026 World Cup, with an
                interactive tactical chat.
              </p>
            </li>
EOF

insert_li "$PT_FILE" "$PT_SNIPPET"
insert_li "$EN_FILE" "$EN_SNIPPET"

echo ""
echo "✓ Done. Review with: git -C $SITE_REPO diff"
