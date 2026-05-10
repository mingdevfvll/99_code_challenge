# api — Express + Prisma

Backend for Problem 5. Express 5 on TypeScript, Prisma over Postgres, Redis for cache and rate limit.

## What is here

- `src/server.ts` wires middleware, routes, OpenAPI docs, and error handling.
- `src/modules/task/` contains route/controller/service/repository/schema files.
- `src/core/` contains environment parsing, Prisma/Redis clients, logging, OpenAPI registry, and middleware.
- `prisma/` contains the Task schema, migrations, and idempotent seed script.

## Run (local, against docker compose backends)

```bash
# from src/problem5/, start the dependencies
docker compose up -d postgres redis

# from this folder
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Then `curl http://localhost:4000/healthz`.

## Run (Docker)

From `src/problem5/`:

```bash
cp .env.example .env
docker compose up --build
```

The API image runs `prisma migrate deploy` and the compiled seed script before starting `node dist/index.js`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Hot-reload dev server (tsx watch) |
| `npm run build` | Compile TS to `dist/` |
| `npm start` | Run the compiled output |
| `npm run typecheck` | tsc --noEmit |
| `npm run lint` | ESLint |
| `npm test` | Vitest (unit + integration) |
| `npm run test:coverage` | With coverage report |
| `npm run test:integration` | Start the test Postgres/Redis stack, run Vitest, then tear it down |
| `npm run db:generate` | Prisma client generation |
| `npm run db:migrate` | Run pending migrations in dev mode |
| `npm run db:migrate:deploy` | Run pending migrations in prod mode (no prompts) |
| `npm run db:reset` | Drop + recreate the DB (dev only) |
| `npm run db:seed` | Insert sample data |
| `npm run db:studio` | Open Prisma Studio |

See `../docs/08-runbook.md` for troubleshooting.

## HTTP surfaces

| Path | Purpose |
|---|---|
| `/healthz` | Liveness |
| `/readyz` | Postgres + Redis readiness |
| `/docs` | Swagger UI |
| `/openapi.json` | OpenAPI document |
| `/api/v1/tasks` | Task list/create |
| `/api/v1/tasks/:id` | Task read/update/delete |
