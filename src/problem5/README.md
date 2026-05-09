# Problem 5 — A Crude Server

Express 5 + TypeScript CRUD API over a Task resource, with a Next.js 15 admin UI on top. Postgres for persistence, Redis for cache and rate limiting, Docker Compose for the whole stack.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

Then:

| Surface | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| API docs (Swagger) | http://localhost:4000/docs |
| Health | http://localhost:4000/healthz |
| Readiness | http://localhost:4000/readyz |

## Layout

```
src/problem5/
├── api/           Express + Prisma backend
├── web/           Next.js 15 admin UI
├── docs/          14 documents — read docs/00-implementation-plan.md first
├── docker-compose.yml
├── docker-compose.test.yml
└── .env.example
```

## What to read

If you have 5 minutes: `docs/00-implementation-plan.md` and stop.

If you have 20: that, plus `docs/02-architecture.md` and `docs/04-api-spec.md`.

If you cloned to run it: `docs/08-runbook.md`.

If you're a reviewer asking "why this and not that": `docs/11-decisions.md`.

## Status

Phase 1 scaffolding. See `docs/09-tasks.md` for the build plan and `docs/10-subtasks.md` for the live checkbox version.
