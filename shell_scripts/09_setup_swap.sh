#!/bin/bash
#
# 09_setup_swap.sh
# ----------------
# Purpose:      Add a swap file to the production host so memory spikes (e.g. the
#               build/preflight during a deploy) degrade gracefully instead of
#               OOM-thrashing. The host is ~1.9 GiB RAM with NO swap; a deploy
#               once drove load to 30 and took the site offline.
#               See devops/copa_2026/EC2_CAPACITY_DEPLOY_SAFETY_ROADMAP.md.
#
# Usage:        ./shell_scripts/09_setup_swap.sh [size] [swappiness]
#
#   size        Swap file size, fallocate syntax. Default: 2G
#   swappiness  vm.swappiness (0-100; lower = prefer RAM). Default: 10
#
# Prerequisites:
#   - sudo access.
#   - An ext4 root filesystem with enough free space for the swap file.
#
# What it does (idempotent — safe to re-run):
#   1. If /swapfile is already active, reports and exits 0.
#   2. Creates /swapfile (fallocate), chmod 600, mkswap, swapon.
#   3. Adds a /etc/fstab entry so swap persists across reboots (only if absent).
#   4. Sets vm.swappiness via /etc/sysctl.d/99-swappiness.conf.
#   5. Prints `free -h` and `swapon --show`.
#
# Exit codes:
#   0  Success (or swap already present).
#   1  Creation/activation failed.

set -euo pipefail

SWAPFILE="/swapfile"
SWAP_SIZE="${1:-2G}"
SWAPPINESS="${2:-10}"

echo "==> Configuring swap (${SWAP_SIZE}, swappiness=${SWAPPINESS})..."

# ── 1. Already active? ────────────────────────────────────────────────────────
if sudo swapon --show=NAME --noheadings 2>/dev/null | grep -qx "$SWAPFILE"; then
    echo "==> $SWAPFILE is already active — nothing to do."
    sudo swapon --show
    free -h
    exit 0
fi

# ── 2. Create + activate the swap file ────────────────────────────────────────
if [ ! -e "$SWAPFILE" ]; then
    echo "==> Allocating $SWAPFILE ($SWAP_SIZE)..."
    if ! sudo fallocate -l "$SWAP_SIZE" "$SWAPFILE"; then
        echo "    fallocate failed; falling back to dd (this is slower)..."
        # Parse a size like "2G"/"512M" into MiB for dd's count.
        num="${SWAP_SIZE%[GgMm]}"
        unit="${SWAP_SIZE: -1}"
        case "$unit" in
            G|g) mib=$(( num * 1024 )) ;;
            M|m) mib=$num ;;
            *)   echo "Error: unsupported size '$SWAP_SIZE' (use e.g. 2G or 512M)." >&2; exit 1 ;;
        esac
        sudo dd if=/dev/zero of="$SWAPFILE" bs=1M count="$mib" status=progress
    fi
else
    echo "==> $SWAPFILE already exists (inactive) — reusing it."
fi

sudo chmod 600 "$SWAPFILE"

# mkswap is a no-op-safe to re-run; it just re-initialises the signature.
sudo mkswap "$SWAPFILE" >/dev/null

echo "==> Enabling swap..."
sudo swapon "$SWAPFILE"

# ── 3. Persist across reboots ─────────────────────────────────────────────────
FSTAB_LINE="$SWAPFILE none swap sw 0 0"
if ! grep -qsF "$SWAPFILE" /etc/fstab; then
    echo "==> Adding $SWAPFILE to /etc/fstab..."
    echo "$FSTAB_LINE" | sudo tee -a /etc/fstab >/dev/null
else
    echo "==> /etc/fstab already references $SWAPFILE — skipping."
fi

# ── 4. Tune swappiness ────────────────────────────────────────────────────────
echo "==> Setting vm.swappiness=$SWAPPINESS..."
echo "vm.swappiness=$SWAPPINESS" | sudo tee /etc/sysctl.d/99-swappiness.conf >/dev/null
sudo sysctl -q -p /etc/sysctl.d/99-swappiness.conf

# ── 5. Report ─────────────────────────────────────────────────────────────────
echo
echo "==> Swap configured:"
sudo swapon --show
free -h
echo
echo "✓ Done. Swap survives reboots and the next deploy build has a cushion."
