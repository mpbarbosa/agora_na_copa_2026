# agora_na_copa_2026

Info about the current event and the next event in the World Cup 2026.

## Local setup

1. Install dependencies:

```sh
npm install
```

2. Create your local environment file from the example and configure `GEMINI_API_KEY` as needed.

3. If you added the key to your zsh configuration instead of `.env`, reload your shell before starting the app:

```sh
if [ -n "${ZSH_VERSION:-}" ]; then
  source "$HOME/.zshrc"
else
  exec zsh
fi
```

4. Start the development server:

```sh
npm run dev
```

If port `3000` is already in use, the dev server automatically moves to the next free port.

## Commands

- `npm run dev` - start the Express + Vite development server on port 3000, or the next free port if 3000 is busy
- `npm run build` - build the frontend and bundle the server
- `npm start` - run the production build
- `npm run lint` - type-check the project with TypeScript
- `npm run test:e2e` - run the Playwright zsh update end-to-end test

## Deployment helpers

- `./scripts/deploy-preflight.sh` - build and validate the deployable production payload
- `./scripts/deploy.sh` - sync the validated payload to the sibling `mpbarbosa.com` repository and push only the `agora_na_copa_2026` subtree
- See `scripts/README.md` for the script workflow summary
