# Scripts Directory

This project now follows the `guia_js` deployment pattern:

- `scripts/deploy-preflight.sh` builds and validates the deployable bundle
- `scripts/deploy.sh` syncs the validated payload to the sibling `mpbarbosa.com` repository and commits only the `agora_na_copa_2026` subtree

## Commands

```sh
./scripts/deploy-preflight.sh
./scripts/deploy.sh
npm run deploy
```
