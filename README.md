```
  __  __                                    
 |  \/  | __ _ _ __  _ __   _____   ____ _ 
 | |\/| |/ _` | '_ \| '_ \ / _ \ \ / / _` |
 | |  | | (_| | |_) | | | | (_) \ V / (_| |
 |_|  |_|\__,_| .__/|_| |_|\___/ \_/ \__,_|
               |_|                           
```

# Mapnova

Universal GIS and parcel search platform — Indiana-first, built to expand nationwide.

[![Live](https://img.shields.io/badge/live-mapnova.org-blue)](https://mapnova.org)

---

## What it is

Mapnova is a single-page GIS application covering all 92 Indiana counties with parcel boundaries, owner data, and property record cards. It combines the IGIO statewide parcel dataset with county-specific ArcGIS services to surface zoning, flood, hydrology, roads, aerial imagery, and 70+ county layers in one place. The long-term goal is a universal parcel search platform that works for any U.S. county — Indiana is the proving ground.

## Live demo

**[mapnova.org](https://mapnova.org)**

---

## Architecture

```
Browser
  │
  ▼
Cloudflare Pages          (apps/web — static HTML/CSS/JS)
  │
  ├── api.mapnova.org
  │     │
  │     ▼
  │   Cloudflare Workers   (apps/api — Hono on Workers runtime)
  │     │
  │     ├── D1             (SQLite — parcel / project data)
  │     └── KV             (edge cache — session / lookup cache)
  │
  └── External services
        ├── IGIO statewide parcel dataset
        ├── ElevateMaps ArcGIS tile services
        └── County ArcGIS REST endpoints
```

See [`docs/adr/`](docs/adr/) for architectural decision records.

---

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| API framework | [Hono](https://hono.dev/) | ^4.6 |
| ORM | [Drizzle](https://orm.drizzle.team/) | planned |
| Auth | [Clerk](https://clerk.com/) | planned |
| Edge runtime | Cloudflare Workers | — |
| Database | Cloudflare D1 (SQLite) | — |
| Cache | Cloudflare KV | — |
| Frontend hosting | Cloudflare Pages | — |
| Monorepo | [Turborepo](https://turbo.build/) | ^2.3 |
| Package manager | pnpm | 9.12 |
| Test runner | Vitest | planned |

---

## Repo layout

```
mapnova/
├── apps/
│   ├── web/              # Frontend — single-file HTML app (index.html)
│   │   ├── index.html    # Entire frontend: HTML + inlined CSS/JS
│   │   ├── css/
│   │   ├── js/
│   │   └── functions/    # Cloudflare Pages Functions
│   └── api/              # Backend — Hono on Cloudflare Workers
│       ├── src/
│       │   ├── index.ts
│       │   └── routes/
│       └── wrangler.toml
├── packages/
│   └── shared/           # Shared TypeScript types and utilities
├── docs/
│   └── adr/              # Architectural Decision Records
├── turbo.json
├── pnpm-workspace.yaml
└── CLAUDE.md             # Agent rules and architecture notes
```

---

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+

```bash
npm install -g pnpm@9
```

### Setup

```bash
git clone https://github.com/isaacvancuren/indiana-gis.git
cd indiana-gis
pnpm install
```

### Run everything

```bash
pnpm dev          # runs turbo run dev across all packages
```

### Frontend only

Open `apps/web/index.html` directly in a browser, or serve it statically:

```bash
cd apps/web
npx serve .
```

### API only

```bash
cd apps/api
pnpm dev          # runs wrangler dev → http://localhost:8787
```

---

## Deployment

Deployment is fully automated via GitHub Actions:

- **[`ci.yml`](.github/workflows/ci.yml)** — runs on every PR: lint, type-check, tests.
- **[`deploy-api.yml`](.github/workflows/deploy-api.yml)** — deploys `apps/api` to Cloudflare Workers on push to `main`.
- **Cloudflare Pages** — auto-deploys `apps/web` on push to `main` via the Pages Git integration. No workflow needed. PR branches get preview URLs at `https://<branch-slug>.mapnova.pages.dev`.

See [`docs/adr/`](docs/adr/) for the reasoning behind these choices.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE)
