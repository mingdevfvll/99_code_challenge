# api — Express + Prisma

Backend for Problem 5. Express 5 on TypeScript, Prisma over Postgres, Redis for cache and rate limit.

## Status

Phase 1 scaffolding. Source tree empty beyond Prisma schema; Phases 2–4 fill in the layers per `../docs/09-tasks.md`.

## Run (local, against docker compose backends)

```bash
# from src/problem5/, start the dependencies
docker compose up -d postgres redis

# from this folder
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init   # first time only
npm run dev
```

Then `curl http://localhost:4000/healthz`.

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
| `npm run db:generate` | Prisma client generation |
| `npm run db:migrate` | Run pending migrations in dev mode |
| `npm run db:migrate:deploy` | Run pending migrations in prod mode (no prompts) |
| `npm run db:reset` | Drop + recreate the DB (dev only) |
| `npm run db:seed` | Insert sample data |
| `npm run db:studio` | Open Prisma Studio |

See `../docs/08-runbook.md` for troubleshooting.
