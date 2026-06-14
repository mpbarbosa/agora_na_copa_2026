#!/bin/bash

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$LIB_DIR/resolve_mpbarbosa_com_root.sh"

payload_is_ready() {
    local candidate="$1"

    [ -d "$candidate/dist" ] &&
        [ -f "$candidate/package.json" ] &&
        [ -f "$candidate/package-lock.json" ] &&
        [ -f "$candidate/.env.example" ]
}

local_project_is_buildable() {
    local candidate="$1"

    [ -f "$candidate/package.json" ] &&
        [ -f "$candidate/package-lock.json" ] &&
        [ -f "$candidate/.env.example" ] &&
        [ -f "$candidate/scripts/deploy-preflight.sh" ]
}

resolve_staging_dir() {
    local project_root="$1"
    local deploy_subtree="$2"
    local sibling_root
    local sibling_candidate
    local configured_candidate="${AGORA_STAGING_DIR:-}"

    if [ -n "$configured_candidate" ]; then
        if payload_is_ready "$configured_candidate"; then
            printf '%s\n' "$configured_candidate"
            return 0
        fi

        echo "Error: AGORA_STAGING_DIR is set, but the deploy payload is incomplete at $configured_candidate" >&2
        echo "Expected: dist/, package.json, package-lock.json, and .env.example" >&2
        return 1
    fi

    sibling_root="$(resolve_mpbarbosa_com_root)"
    sibling_candidate="$sibling_root/$deploy_subtree"

    if payload_is_ready "$sibling_candidate"; then
        printf '%s\n' "$sibling_candidate"
        return 0
    fi

    if payload_is_ready "$project_root" || local_project_is_buildable "$project_root"; then
        printf '%s\n' "$project_root"
        return 0
    fi

    echo "Error: staging payload not found." >&2
    echo "Checked sibling staging repo: $sibling_candidate" >&2
    echo "Checked local project build: $project_root" >&2
    echo "Run ./scripts/deploy.sh to refresh the sibling payload, or ensure the local repo contains package manifests plus scripts/deploy-preflight.sh." >&2
    return 1
}
