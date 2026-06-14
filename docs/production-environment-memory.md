# Production environment memory

Generated: 2026-06-14T03:44:37.428+00:00

## Role

- This machine is the **production environment** for `agora_na_copa_2026`.
- The **development environment runs on a different machine**.

## Repository context

- Repository: `mpbarbosa/agora_na_copa_2026`
- Remote: `git@github.com:mpbarbosa/agora_na_copa_2026.git`
- Working tree root: `/home/ubuntu/Documents/GitHub/agora_na_copa_2026`
- Active branch: `main`

## Machine and runtime

- Hostname: `ip-172-31-7-80`
- OS: `Linux 6.17.0-1017-aws x86_64 GNU/Linux`
- Node.js: `v25.2.1`
- npm: `11.6.4`

## Application commands available here

- `npm run dev` - starts the Express/Vite development server
- `npm run build` - builds the frontend and bundles `server.ts` into `dist/server.cjs`
- `npm start` - runs the production bundle
- `npm run lint` - runs `tsc --noEmit`
- `npm run test:e2e` - runs Playwright end-to-end tests
- `npm run deploy` - runs `./scripts/deploy.sh`
- `npm run deploy:preflight` - runs `./scripts/deploy-preflight.sh`

## Notes for future memory use

- Treat this document as environment-specific context for production-only tasks.
- Avoid assuming that local development behavior, ports, or machine state match this host.
