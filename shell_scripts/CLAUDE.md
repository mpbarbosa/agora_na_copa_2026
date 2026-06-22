# shell_scripts/

One-time production server provisioning scripts for the AWS host running the `agora-na-copa-2026` systemd service. **Run numbered in order on a fresh server.** Scripts 01–05 are idempotent but designed for initial setup; do not re-run 02 (it would overwrite the production `.env`).

## Script sequence

| Script | When to run | What it does |
|--------|------------|-------------|
| `01_setup_app_directory.sh` | First deploy | Creates `/var/www/agora_na_copa_2026`, syncs the validated build payload, runs `npm ci --omit=dev` |
| `02_create_env.sh` | Once | Writes the production `.env` file. **Never re-run** — the `.env` is preserved across deploys and this would overwrite it |
| `03_install_systemd_service.sh` | Once | Installs and enables the `agora-na-copa-2026` systemd service |
| `04_setup_nginx.sh` | Once | Configures nginx reverse proxy for the subdomain |
| `05_setup_tls.sh` | Once | Issues TLS certificate via certbot nginx plugin |
| `06_redeploy.sh` | Every deploy | Syncs the latest staging payload and restarts the service. Called by `scripts/deploy.sh` on production hosts |
| `07_add_portfolio_link.sh` | Once | Adds portfolio backlink to the `mpbarbosa.com` landing pages |
| `08_setup_monitoring.sh` | Once | Enables timed nginx access logging (`agora_timed` log format with `rt=` and `urt=` fields); safe to run after certbot — injects surgically rather than overwriting |
| `09_setup_swap.sh` | Once | Adds a `/swapfile` (default 2G) + sets `vm.swappiness`, so deploy-time memory spikes don't OOM-thrash the ~1.9 GiB host. Idempotent. See `devops/copa_2026/EC2_CAPACITY_DEPLOY_SAFETY_ROADMAP.md` |

## lib/

Shared bash utilities sourced by the numbered scripts:

| File | Exports |
|------|---------|
| `deploy_defaults.sh` | `DEFAULT_APP_DOMAIN`, `DEFAULT_APP_URL`, `DEFAULT_APP_PORT` |
| `resolve_mpbarbosa_com_root.sh` | Locates the sibling `mpbarbosa.com` repo root |
| `resolve_staging_dir.sh` | Resolves the staging directory path |
| `stage_deploy_payload.sh` | Stages `dist/` + `package.json` + `package-lock.json` for sync |

## Important

- These scripts run on the **production host** (SSH in, then run). They do not run locally except for `06_redeploy.sh` which is called by `scripts/deploy.sh`.
- The production `.env` (API keys, port overrides) is never committed to git and is preserved across deploys by rsync's `--ignore-existing` logic. Only touch it directly on the server.
- Changes to these scripts are rare. When editing, test with `bash -n <script>` (syntax check) before running on the server.
