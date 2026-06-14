#!/bin/bash

resolve_mpbarbosa_com_root() {
    local configured_root="${1:-${MPBARBOSA_COM_ROOT:-}}"
    local candidate
    local candidates=(
        "/var/www/mpbarbosa.com"
        "$HOME/Documents/GitHub/mpbarbosa.com"
    )

    if [ -n "$configured_root" ]; then
        if [ -d "$configured_root/.git" ]; then
            printf '%s\n' "$configured_root"
            return 0
        fi

        echo "Error: mpbarbosa.com repository not found at '$configured_root'" >&2
        return 1
    fi

    for candidate in "${candidates[@]}"; do
        if [ -d "$candidate/.git" ]; then
            printf '%s\n' "$candidate"
            return 0
        fi
    done

    echo "Error: mpbarbosa.com repository not found. Checked /var/www/mpbarbosa.com and \$HOME/Documents/GitHub/mpbarbosa.com" >&2
    return 1
}
