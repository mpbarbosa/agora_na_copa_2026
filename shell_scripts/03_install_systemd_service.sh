#!/bin/bash
#
# 03_install_systemd_service.sh
# ------------------------------
# Purpose:      Install and enable a systemd service that runs the
#               agora_na_copa_2026 production server (dist/server.cjs)
#               persistently, restarting it on failure or reboot.
#
# Usage:        ./shell_scripts/03_install_systemd_service.sh
#
# Prerequisites:
#   - /var/www/agora_na_copa_2026/dist/server.cjs exists (01_setup_app_directory.sh).
#   - /var/www/agora_na_copa_2026/.env exists (02_create_env.sh).
#   - sudo access.
#
# What it does:
#   1. Writes /etc/systemd/system/agora-na-copa-2026.service.
#   2. Reloads the systemd daemon.
#   3. Enables and starts the service.
#   4. Prints its status.
#
# Exit codes:
#   0  Success.
#   1  Prerequisites missing.

set -euo pipefail

SERVICE_NAME="agora-na-copa-2026"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
DEPLOY_DIR="/var/www/agora_na_copa_2026"
RUN_USER="$(id -un)"

NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
    echo "Error: node not found on PATH" >&2
    exit 1
fi

if [ ! -f "$DEPLOY_DIR/dist/server.cjs" ]; then
    echo "Error: $DEPLOY_DIR/dist/server.cjs not found. Run 01_setup_app_directory.sh first." >&2
    exit 1
fi

if [ ! -f "$DEPLOY_DIR/.env" ]; then
    echo "Error: $DEPLOY_DIR/.env not found. Run 02_create_env.sh first." >&2
    exit 1
fi

echo "==> Writing $SERVICE_FILE (requires sudo)..."
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Agora na Copa 2026
After=network.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${DEPLOY_DIR}
EnvironmentFile=${DEPLOY_DIR}/.env
ExecStart=${NODE_BIN} dist/server.cjs
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

echo "==> Reloading systemd daemon..."
sudo systemctl daemon-reload

echo "==> Enabling and starting ${SERVICE_NAME}..."
sudo systemctl enable --now "$SERVICE_NAME"

echo ""
sudo systemctl status "$SERVICE_NAME" --no-pager
