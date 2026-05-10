# Runbook

> How to run it, how to break it, how to fix it. Short on prose, long on commands.

## Prerequisites

- Docker Desktop or equivalent (compose v2).
- For dev mode without Docker: Node 20+, pnpm or npm 10+, a local Postgres 16, a local Redis 7.

## TL;DR

```bash
cd src/problem5
cp .env.example .env
docker compose up --build
# Web    → http://localhost:3000
# API    → http://localhost:4000
# Docs   → http://localhost:4000/docs
# Health → http://localhost:4000/healthz
```

That's the whole runbook for the happy path.

## Environment variables

`.env.example` documents every variable required by Docker Compose. The compose
files intentionally do not define fallback values; copy `.env.example` to `.env`
first so a missing value fails at startup instead of silently changing behavior.
The ones that matter:

| Var | Default | Where used | Notes |
|---|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/tasks` | api | Prisma. In dev (no Docker), point at `localhost:5432`. |
| `REDIS_URL` | `redis://redis:6379` | api | ioredis. |
| `API_PORT` | `4000` | api | |
| `WEB_PORT` | `3000` | web | |
| `PORT` | `3000` | web | Container port consumed by Next standalone. |
| `HOSTNAME` | `0.0.0.0` | web | Bind address consumed by Next standalone. |
| `WEB_ORIGIN` | `http://localhost:3000` | api | CORS allowlist. Comma-separate for multiple. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | web | Browser-side fetches. |
| `LOG_LEVEL` | `info` | api | `debug` for verbose. |
| `RATE_LIMIT_GLOBAL` | `100` | api | per-IP per-minute |
| `RATE_LIMIT_MUTATIONS` | `30` | api | per-IP per-minute |
| `NODE_ENV` | `production` (in Docker) / `development` (local) | both | |

There are no secrets. If there were, they would not be in `.env.example`.

## Run modes

### Full stack via Docker (recommended)

```bash
docker compose up --build
```

First run takes ~60s (image pulls + builds). Subsequent runs ~10s.

Compose reads runtime configuration from `.env`. Do not add secrets or per-machine
values directly to `docker-compose.yml`; put them in `.env` and keep only safe
examples in `.env.example`.

To rebuild after dependency changes:

```bash
docker compose up --build api
docker compose up --build web
```

To run in detached mode and tail logs:

```bash
docker compose up -d
docker compose logs -f api
```

To wipe the database and start clean:

```bash
docker compose down -v   # -v drops named volumes
docker compose up --build
```

### Dev mode (API only, no Docker for the API)

You'll need a Postgres and Redis somewhere. Easiest: run those in Docker, the API in your terminal.

```bash
# from src/problem5/
docker compose up -d postgres redis

# in src/problem5/api/
npm install
cp .env.example .env
# edit .env: change @postgres → @localhost, @redis → @localhost
npx prisma generate
npx prisma migrate dev
npm run dev
```

`npm run dev` uses `tsx watch` so file edits hot-reload without ts-node config gymnastics.

### Dev mode (web only)

```bash
# in src/problem5/web/
npm install
cp .env.example .env.local
# edit .env.local: set NEXT_PUBLIC_API_URL=http://localhost:4000 (already the default)
npm run dev
```

The web's dev server expects the API to be running. If it isn't, the table will render `ErrorState` and offer a retry.

## Common operations

### Database

```bash
# Open a psql shell against the running container
docker compose exec postgres psql -U postgres -d tasks

# Useful one-liners inside psql
\dt                                  -- list tables
\d "Task"                            -- describe Task
SELECT count(*) FROM "Task";
SELECT status, count(*) FROM "Task" GROUP BY status;
```

### Migrations

```bash
# Inside the api/ folder, dev mode
npx prisma migrate dev --name <description>

# Inside the running api container
docker compose exec api npx prisma migrate deploy

# Reset the dev DB (drops everything, re-migrates, re-seeds)
docker compose exec api npx prisma migrate reset
```

### Seed

```bash
docker compose exec api npm run db:seed
```

Idempotent: running it twice doesn't duplicate rows. The seed script upserts by a stable key.

### Cache

```bash
# All keys
docker compose exec redis redis-cli --scan --pattern 'tasks:*'

# Inspect one
docker compose exec redis redis-cli GET 'tasks:item:clx7m9...'

# Flush everything (cache only; data persists in Postgres)
docker compose exec redis redis-cli FLUSHDB
```

### Tests

```bash
# Inside src/problem5/api/
npm run test                    # unit + integration
npm run test:watch
npm run test:coverage
npm run test:integration        # spins up test compose stack, runs, tears down
```

## Things that have gone wrong (or will)

### `error: relation "Task" does not exist`

The API tried to query before migrations ran. Either the API container started before Postgres was healthy, or migrations weren't run in dev mode.

Fix:

```bash
# Docker
docker compose down
docker compose up --build

# Dev
npx prisma migrate deploy
```

If it persists: the API's Docker `command` runs `prisma migrate deploy && node dist/index.js`. If that step is failing silently, check the API container logs:

```bash
docker compose logs api | head -40
```

### `Error: connect ECONNREFUSED ...:5432`

Postgres isn't reachable. In Docker, this usually means the API started before Postgres healthchecked. The compose file has `depends_on.condition: service_healthy` for exactly this; if it's still happening:

```bash
docker compose ps
docker compose logs postgres | tail
```

If postgres is healthy but the API still can't reach it, check `DATABASE_URL` in `.env` matches the compose service hostname (`postgres`, not `localhost`).

### Web shows "Could not load tasks"

Check, in order:

1. Is the API up? `curl http://localhost:4000/healthz`
2. Is `/readyz` happy? `curl http://localhost:4000/readyz`
3. Is CORS configured for the web origin? `WEB_ORIGIN` in `.env` should match what the browser is using.
4. Open the browser devtools network tab and look for the failing request. The response body has a `requestId` and the `code` field. Grep the API logs for the request id.

### API logs show 503s in a tight cluster

Either Postgres or Redis fell over. Look at:

```bash
docker compose logs api | grep -E '(ECONNREFUSED|read ECONNRESET|Connection lost)'
docker compose logs postgres | tail -40
docker compose logs redis | tail -40
```

If Redis is the problem, the API should keep serving (cache degrades to no-cache; reads hit the DB). If it's not, that's a bug in the cache wrapper.

### `Error: P1001` — can't reach the database server

Same family as ECONNREFUSED. Migration step couldn't connect. Most likely cause: forgot to start the postgres container, or the host/port in `DATABASE_URL` is wrong.

### Port already in use (3000, 4000, 5432, 6379)

Some other process is bound. Either stop it, or override the port in `.env` and restart:

```bash
# In .env
WEB_PORT=3001
# Then
docker compose up
```

The compose file maps ports through env vars; you don't need to edit it.

### `next build` fails with "Module not found: @/lib/utils"

TypeScript path aliases aren't picked up. Check `tsconfig.json`'s `paths` matches Next.js's expectation, and that `next.config.ts` doesn't strip them.

### Tests pass locally but fail in fresh checkout

Almost always a stale generated Prisma client.

```bash
cd api && npx prisma generate && npm run test
```

## Stopping cleanly

```bash
docker compose down            # stop containers, keep volumes
docker compose down -v         # stop and drop the postgres volume (data loss)
```

`Ctrl+C` on `docker compose up` (foreground) is also fine; compose handles SIGINT cleanly. The API process inside the container traps SIGTERM and closes Prisma + Redis connections before exiting, so logs end gracefully rather than mid-statement.

## Updating dependencies

This repo doesn't have a `renovate.json` or Dependabot config. To update:

```bash
# api/
npm outdated
npm update            # respects semver in package.json
npm install <pkg>@latest    # for major bumps; commit + test
```

Same in `web/`. Major bumps for Next.js, Prisma, or Express get their own commit and a manual test pass.
