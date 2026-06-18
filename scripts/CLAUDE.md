# scripts/

Data-enrichment and deployment scripts. These are not part of the application bundle — they are run locally (or on the server) to update source files in `src/`.

## Data scripts

Run these when you need to refresh data in `src/data/squads.json` or `src/matches.json`. They never modify the running app; they write to source files that must then be committed and deployed.

| Script | Language | What it does | When to run |
|--------|----------|-------------|-------------|
| `bootstrap-squads.ts` | TypeScript (tsx) | One-off: extracts all players from `src/matches.json` into `src/data/squads.json`, seeding FIFA IDs from `pictureUrl` tails. | Once, or after a full matches.json rebuild. Do not re-run on an enriched squads.json — it overwrites. |
| `enrich-squads-fifa.py` | Python 3 | Fills missing `dateOfBirth` and `height` in `squads.json` using the FIFA player API (`api.fifa.com`). Never overwrites existing values. Safe to re-run. | After bootstrapping, or when new players are added. Supports `--dry-run`. |
| `enrich-squads-wikidata.py` | Python 3 | Fills missing `dateOfBirth` and `height` from Wikidata (via FIFA player ID / P2071). Complementary to the FIFA script. Safe to re-run. | Run after `enrich-squads-fifa.py` to catch players the FIFA API missed. Supports `--dry-run`. |
| `sync-match-results.py` | Python 3 | Updates `status` and `score` in `src/matches.json` from the FIFA calendar API. Never touches lineups, broadcasters, or other curated fields. | Before every deploy to bake in current results. |
| `rebuild-squad.py` | Python 3 | Fetches a specific match from the FIFA API and rebuilds that team's squad entries from the live lineup. Takes `TEAM_CODE` and `MATCH_ID` as arguments. | When a team's lineup in `matches.json` is stale or wrong for a specific match. |

## Deployment scripts

| Script | What it does |
|--------|-------------|
| `deploy-preflight.sh` | Builds the bundle and smoke-tests it locally before deploying. Equivalent to `npm run deploy:preflight`. |
| `deploy.sh` | Rsyncs `dist/` to the sibling `mpbarbosa.com` repo, commits the subtree, and on production hosts runs `shell_scripts/06_redeploy.sh`. Equivalent to `npm run deploy`. |

## Typical enrichment workflow

```sh
# 1. Sync results first (touches only status/score)
python3 scripts/sync-match-results.py

# 2. Enrich missing player metadata (safe to run in any order)
python3 scripts/enrich-squads-fifa.py --dry-run   # preview first
python3 scripts/enrich-squads-fifa.py
python3 scripts/enrich-squads-wikidata.py

# 3. Commit the updated source files
git add src/matches.json src/data/squads.json
git commit -m "chore(data): sync match results and enrich squad metadata"
```

## Notes

- All Python scripts require Python 3.9+ and no external dependencies beyond the standard library.
- `bootstrap-squads.ts` requires `npx tsx scripts/bootstrap-squads.ts` — it is the only TypeScript script here.
- Scripts that call the FIFA API (`enrich-squads-fifa.py`, `sync-match-results.py`, `rebuild-squad.py`) include a `time.sleep` between requests to avoid rate-limiting.
