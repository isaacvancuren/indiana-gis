# @mapnova/api

Cloudflare Worker for Mapnova. Built with Hono + TypeScript.

## Routes

| Path | Description |
|---|---|
| `GET /health` | liveness check, returns `{ ok: true, version }` |

## Deploy

Pushed to `main` automatically via `.github/workflows/deploy-api.yml`. Manual deploy via the Actions tab → Deploy API → Run workflow.

## Local dev

```bash
pnpm install
pnpm dev   # runs `wrangler dev`
```
