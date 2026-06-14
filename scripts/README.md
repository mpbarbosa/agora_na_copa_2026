# Scripts Directory

This project now follows the `guia_js` deployment pattern:

- `scripts/deploy-preflight.sh` builds and validates the deployable bundle
- `scripts/deploy.sh` syncs the validated payload to the sibling `mpbarbosa.com` repository, commits only the `agora_na_copa_2026` subtree, and on production hosts also runs `shell_scripts/06_redeploy.sh`
- `shell_scripts/01_setup_app_directory.sh` and `shell_scripts/06_redeploy.sh` accept either the sibling staged payload or a local built `dist/`

## Commands

```sh
./scripts/deploy-preflight.sh
./scripts/deploy.sh
npm run deploy
```
