#!/bin/bash

stage_deploy_payload() {
    local source_dir="$1"
    local stage_dir

    if [ ! -d "$source_dir/dist" ] ||
        [ ! -f "$source_dir/package.json" ] ||
        [ ! -f "$source_dir/package-lock.json" ] ||
        [ ! -f "$source_dir/.env.example" ]; then
        echo "Error: incomplete deploy payload at $source_dir" >&2
        echo "Expected: dist/, package.json, package-lock.json, and .env.example" >&2
        return 1
    fi

    stage_dir="$(mktemp -d "${TMPDIR:-/tmp}/agora-payload.XXXXXX")"
    mkdir -p "$stage_dir/dist"

    rsync -a --delete "$source_dir/dist/" "$stage_dir/dist/"
    cp "$source_dir/package.json" "$stage_dir/package.json"
    cp "$source_dir/package-lock.json" "$stage_dir/package-lock.json"
    cp "$source_dir/.env.example" "$stage_dir/.env.example"

    printf '%s\n' "$stage_dir"
}
