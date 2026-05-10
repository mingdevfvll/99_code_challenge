# Implementation Plan — Problem 5: CRUD Server

> Author: Ming
> Date: 2026-05-09
> Status: Draft, pre-implementation
>
> This is the master plan. It captures every decision I've already made and the reasoning behind each one. The other files in `docs/` go deeper on individual topics. Use this one as the map.

---

## 0. Reading order

If you're reviewing this without context:

1. `00-implementation-plan.md` (this file). The whole picture.
2. `01-overview.md`. What the problem asks for, and how I scoped it.
3. `02-architecture.md`. Request lifecycle, layer boundaries.
4. `03-data-model.md`. Prisma schema, indexing choices.
5. `04-api-spec.md`. REST contract, errors, examples.
6. `11-decisions.md`. ADR-style record of every non-obvious choice.

The remaining docs (`05`–`10`, `12`, `13`) are reference material. Pull them up when a specific topic comes up.

---

## 1. The brief, in my own words

The exercise asks for a TypeScript Express server that does CRUD over a single resource, persists to a database, and ships with a README. That is the floor.

I want to clear the floor in a way that doesn't look like the floor. Specifically:

- A real layered architecture, not handlers wired straight to Prisma.
- Validation that flows from one Zod schema to both the request validator and the OpenAPI spec, so docs cannot drift from code.
- A small Next.js admin UI on top, because the brief is tagged "Backend" and "Fullstack" and the recruiter explicitly said UI counts.
- Docker compose that starts the whole stack with one command, including Postgres and Redis.
- Documentation that reads like a person wrote it.

The 16-hour budget in the brief is for internships. I'm aiming for roughly that. The discipline I'm holding myself to is about what to cut when I run over, which I will.

---

## 2. Constraints I'm planning around

| Constraint | Implication |
|---|---|
| Solo author, ~16h hard cap | I have to cut something. I'd rather cut features than cut quality on what ships. |
| Interview submission, not a real product | No auth, no multi-tenancy, no production deploy. Optimize for "is this person someone I want on my team" reading. |
| Repo already has Problems 1–3 with strong conventions | New code must look like it belongs. Same Zod patterns as `fancy-ex`, same kebab-case + `'use client'` style as `wallet-app`, same per-folder README pattern across all three. |
| Reviewer might never run it | Screenshots, README walkthrough, and `04-api-spec.md` need to stand on their own. |
| Reviewer might run it on the first try | `docker compose up` has to work without surprises. |

The last two pull in opposite directions. I'm planning for both, knowing one of them will be the one that matters.

---

## 3. What I'm building

**Domain: Task manager.** Five fields plus tags. `title`, `description`, `status`, `priority`, `dueDate`, `tags[]`. Enough for the filter logic to be non-trivial without ballooning the schema.

I considered Product (catalog) and Note. Product needed too much around money formatting and inventory semantics for the time I had. Note had too few axes to make filtering interesting. Task fits in between, and every field maps cleanly to a real UI element.

**Deliverables:**

```
src/problem5/
├── README.md                ← Quick start, link to docs
├── docker-compose.yml       ← Full stack: postgres, redis, api, web
├── docker-compose.test.yml  ← Override for integration tests
├── .env.example
├── api/                     ← Express + TS + Prisma backend
├── web/                     ← Next.js 16 + shadcn admin UI
└── docs/                    ← 13 documents (this file is one)
```

Both `api/` and `web/` are independent npm projects. Same shape as how `problem2/fancy-ex/` and `problem3/wallet-app/` are independent today. I considered a pnpm workspace to share the Zod schemas; the setup time isn't worth it for two consumers. I'll duplicate the schema and write a paragraph in `11-decisions.md` saying so.

---

## 4. Stack and reasoning

### Backend

**Express 5 + TypeScript 5 strict.** The brief says ExpressJS and TypeScript. Express 5 is GA, and async errors propagate to the error handler without wrapper functions. Strict mode matches the rest of the repo.

**Prisma 5 + PostgreSQL 16.** Schema-first, migrations generated, type-safe client end-to-end. Drizzle was the alternative I weighed seriously. It has a lighter runtime and feels more SQL-native. Prisma costs me about 30 seconds of cold start in Docker, but it saves me a day of writing my own type-safe query layer and the migrations workflow is harder to mess up. For a 16h scope, that math is easy.

**Zod 4** for validation. Same library as `fancy-ex`. One schema serves request validation, response typing, and OpenAPI generation via `@asteasolutions/zod-to-openapi`. This is the single biggest leverage point in the codebase.

**Redis 7 with `ioredis`.** Both cache and rate-limit store. One backing service, fewer things to think about when something breaks at 3am. `express-rate-limit` + `rate-limit-redis` for the limiter, `ioredis` directly for cache.

**pino + pino-http** for logs. Structured JSON in production, pretty-printed in dev. I want request-id correlation from day one, not bolted on later.

**helmet, cors, compression.** Standard. Helmet defaults are fine; CORS reads from `WEB_ORIGIN` env.

**vitest + supertest** for tests. Vitest has the fastest cold start I've used and the watch mode is cleaner than Jest's. Supertest is the boring obvious choice for HTTP integration.

**tsx** for dev. Skips the `ts-node` config gymnastics that drag down every TS server I've worked on.

### Frontend

| Choice | Why |
|---|---|
| Next.js 16 App Router + React 19 | Same architecture as the original plan. Server components are not strictly needed here, but `output: 'standalone'` keeps the Docker image lean. |
| shadcn/ui + Tailwind 3 | Same as `fancy-ex`. Accessible Radix primitives, full markup control. |
| TanStack Query 5 | Same as `fancy-ex`'s `usePrices`. Cache, optimistic updates, invalidation. |
| React Hook Form + zodResolver | Same as `useSwapForm`. Form Zod schema mirrors the API request schema. |
| framer-motion, lucide-react, sonner, next-themes | Already in the repo's vocabulary. No reason to introduce alternatives. |

### Infra

Docker Compose v2 for the local stack. No Kubernetes; that would add infrastructure surface area without helping this problem. `postgres:16-alpine` and `redis:7-alpine` because they're official, small, and the versions I run locally. Multi-stage Dockerfiles keep runtime images limited to production assets.

---

## 5. Architecture at a glance

```
                              ┌─────────────────┐
                              │  Next.js (web)  │   :3000
                              └────────┬────────┘
                                       │  fetch + Zod parse
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Express API (api)                                  :4000   │
│                                                             │
│   middleware: helmet → cors → compression → request-id      │
│             → pino-http → rate-limit → router               │
│                                                             │
│   routes/              controllers/    services/   repositories/
│     task.routes        task.controller task.service task.repository
│     health.routes      ↓                ↓            ↓
│                      validate(Zod)   cache(Redis)  Prisma
│                                                             │
│   error handler (last middleware) → RFC-7807-shaped envelope│
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
        ┌────────────┐                 ┌────────────┐
        │ PostgreSQL │  :5432          │   Redis    │  :6379
        └────────────┘                 └────────────┘
```

**Request lifecycle for a write** (e.g. `POST /api/v1/tasks`):

1. Express middleware chain assigns a `x-request-id`, logs the inbound request, applies rate limit (Redis-backed), then hands off to the router.
2. `task.routes.ts` invokes `validate(createTaskSchema)`. The Zod parse replaces `req.body` with a typed value. Failure short-circuits with a 400 envelope.
3. `task.controller.ts` calls `taskService.create(input)`.
4. `task.service.ts` calls `taskRepository.create(input)`, then invalidates the list cache prefix.
5. `task.repository.ts` runs the Prisma `create`. This is the only file that knows Prisma exists.
6. The controller wraps the result in `{ data: task }` and sends 201.

**For a read** (e.g. `GET /api/v1/tasks?status=TODO&limit=20`):

The service builds a cache key from a stable hash of the parsed query, then `cache.getOrSet(key, 30, () => repo.findMany(filters))`. List TTL 30s, single-item TTL 60s. Mutations invalidate by key prefix.

I picked the `routes → controller → service → repository` shape because it mirrors what `fancy-ex` does on the frontend with `hooks → lib → component`. A reviewer who read Problem 2 will pattern-match this in seconds.

---

## 6. Folder layout

```
src/problem5/
├── README.md
├── docker-compose.yml
├── docker-compose.test.yml
├── .env.example
│
├── api/
│   ├── README.md
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── src/
│       ├── index.ts                      # bootstrap + graceful shutdown
│       ├── server.ts                     # createApp() factory (testable)
│       ├── modules/
│       │   ├── task/
│       │   │   ├── task.routes.ts
│       │   │   ├── task.controller.ts
│       │   │   ├── task.service.ts
│       │   │   ├── task.repository.ts
│       │   │   ├── task.schema.ts        # Zod
│       │   │   └── task.openapi.ts
│       │   └── health/
│       │       └── health.routes.ts
│       ├── core/
│       │   ├── config/env.ts
│       │   ├── middleware/
│       │   │   ├── error-handler.ts
│       │   │   ├── validate.ts
│       │   │   ├── rate-limit.ts
│       │   │   ├── request-id.ts
│       │   │   └── not-found.ts
│       │   ├── lib/
│       │   │   ├── prisma.ts
│       │   │   ├── redis.ts
│       │   │   ├── cache.ts
│       │   │   └── logger.ts
│       │   ├── errors/http-errors.ts
│       │   └── openapi/
│       │       ├── registry.ts
│       │       └── docs.routes.ts
│       └── tests/
│           ├── helpers/test-app.ts
│           ├── task.create.test.ts
│           ├── task.list.filters.test.ts
│           ├── task.update.test.ts
│           └── task.delete.test.ts
│
└── web/
    ├── README.md
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.mjs
    ├── components.json
    ├── Dockerfile
    ├── .dockerignore
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── page.tsx                      # redirects to /tasks
    │   └── tasks/
    │       ├── page.tsx                  # list + filters + create
    │       └── [id]/page.tsx             # detail + edit + delete
    ├── components/
    │   ├── ui/
    │   ├── task-table.tsx
    │   ├── task-row.tsx
    │   ├── task-filters-bar.tsx
    │   ├── task-form-dialog.tsx
    │   ├── task-status-badge.tsx
    │   ├── task-priority-badge.tsx
    │   ├── confirm-delete-dialog.tsx
    │   ├── empty-state.tsx
    │   ├── error-state.tsx
    │   └── theme-toggle.tsx
    ├── hooks/
    │   ├── use-tasks-query.ts
    │   ├── use-task-query.ts
    │   ├── use-create-task.ts
    │   ├── use-update-task.ts
    │   ├── use-delete-task.ts
    │   └── use-task-filters.ts
    ├── lib/
    │   ├── api-client.ts
    │   ├── query-client.ts
    │   ├── format-date.ts
    │   └── utils.ts
    ├── schemas/
    │   └── task.ts
    └── types/
        └── task.ts
```

API uses kebab-case files (NestJS-style, also matches `wallet-app`). Web matches `wallet-app` exactly. Naming is consistent end-to-end so a reviewer can pattern-match between problems without thinking about it.

---

## 7. Data model

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
  ARCHIVED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model Task {
  id          String       @id @default(cuid())
  title       String       @db.VarChar(200)
  description String?      @db.Text
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  dueDate     DateTime?
  tags        String[]     @default([])
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([status])
  @@index([priority])
  @@index([dueDate])
  @@index([createdAt(sort: Desc)])
  @@index([tags], type: Gin)
}
```

Notes that aren't obvious from the schema:

I picked `cuid()` over UUID v4 because it sorts by creation time and is shorter in URLs. Trade-off: cuid is library-specific. If the data ever needs to leave Prisma, UUIDs are more portable. Fine for the scope.

`tags` is `text[]` with a GIN index. The `tags @> ARRAY['x']::text[]` query lands sub-millisecond on the data sizes I'll have. The alternative is a `Tag` table plus `TaskTag` join. That would be the right call if tags grow metadata (color, owner, count). They don't, so I'm not building it.

No soft-delete column. `status = ARCHIVED` plays that role for this domain, and having two ways to mark something gone is the kind of thing that bites a year later.

`@@index([createdAt(sort: Desc)])` is the index that backs the default sort. I'm calling it out explicitly because it's the one I usually forget.

`03-data-model.md` goes deeper on each index and the alternative shapes I weighed.

---

## 8. API contract summary

Base path: `/api/v1`. JSON in, JSON out. Success envelope `{ data: ... }`, error envelope `{ error: { code, message, details?, requestId } }`.

| Method | Path | Status codes | Notes |
|---|---|---|---|
| `POST` | `/api/v1/tasks` | 201, 400 | Body validated against `createTaskSchema`. |
| `GET` | `/api/v1/tasks` | 200 | Filters, sort, cursor pagination. List cache 30s. |
| `GET` | `/api/v1/tasks/:id` | 200, 404 | Item cache 60s. ETag header on response. |
| `PATCH` | `/api/v1/tasks/:id` | 200, 400, 404 | Partial update. Validated against `updateTaskSchema`. |
| `DELETE` | `/api/v1/tasks/:id` | 204, 404 | Hard delete. Idempotent at the HTTP layer. |
| `GET` | `/healthz` | 200 | Liveness. Always 200 if the process is up. |
| `GET` | `/readyz` | 200, 503 | Readiness. Pings Postgres and Redis. |
| `GET` | `/docs` | 200 | Swagger UI generated from Zod. |
| `GET` | `/openapi.json` | 200 | OpenAPI 3.1 spec. |

**List query parameters:**

```
?status=TODO&status=IN_PROGRESS     (multi-value)
&priority=HIGH&priority=URGENT      (multi-value)
&q=invoice                          (ILIKE on title + description)
&dueBefore=2026-06-01T00:00:00Z
&dueAfter=2026-05-01T00:00:00Z
&tags=billing,client                (any-of)
&sort=-dueDate,createdAt            (comma list, leading - = desc)
&limit=20                           (default 20, max 100)
&cursor=clxyz...                    (opaque cursor from previous page)
```

**Error codes inside the envelope:**

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod parse failed. `details` lists per-field issues. |
| 404 | `NOT_FOUND` | Resource doesn't exist. Also returned for hard-delete retry. |
| 409 | `CONFLICT` | Reserved for future unique-constraint violations. |
| 429 | `RATE_LIMITED` | Per-IP threshold hit. `Retry-After` header included. |
| 500 | `INTERNAL_ERROR` | Anything uncaught. `requestId` in the body for log correlation. |

Full request/response examples live in `04-api-spec.md`.

---

## 9. Frontend approach

One page that matters: `/tasks`.

```
┌─────────────────────────────────────────────────────────┐
│  Tasks                                  [+ New task]    │  header
├─────────────────────────────────────────────────────────┤
│  [search]  [status ▾]  [priority ▾]  [due ▾]  [sort ▾] │  filters bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Title              status   priority   due  ⋮   │    │
│  │ Title              status   priority   due  ⋮   │    │
│  │ Title              status   priority   due  ⋮   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│                  [ Load more ]                          │
└─────────────────────────────────────────────────────────┘
```

**State model.** `useTaskFilters()` syncs filter state with URL search params, so the URL is a shareable link to a filtered view. `useTasksQuery(filters)` wraps `useQuery` keyed by `['tasks', filters]` with `staleTime: 30_000` matching the API cache TTL. Mutations do optimistic updates with rollback on error. Status changes from the inline dropdown commit immediately. Full edits go through the dialog.

**Three-state UX** (loading, error, empty), same shape as `fancy-ex`:

- Loading: skeleton rows that match the real row dimensions. No layout shift.
- Error: inline card with retry. Same visual weight as `PriceErrorCard`.
- Empty: friendly CTA when the unfiltered list is empty. "No tasks match these filters" with a clear-filters button when filters are active.

**Form for create/edit.** One `task-form-dialog` component, modes `create` and `edit`. shadcn `Dialog` + RHF + zodResolver. Field set: title (required), description (textarea, plain text), status (select), priority (select), dueDate (date picker), tags (chip input, comma to commit).

I'm still deciding on the tag chip input UX. There's no shadcn primitive for it; I'll either pull a small recipe from the shadcn community examples or write 30 lines of input + array state. Will figure out once I get there.

`05-frontend-design.md` has the component map, props, and motion specs.

---

## 10. Docker setup

`docker-compose.yml` runs four services: `postgres`, `redis`, `api`, `web`. Healthchecks gate each `depends_on` so the API doesn't try to migrate against a DB that isn't ready, and the web doesn't try to fetch from an API that isn't ready.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    healthcheck: pg_isready
    volumes: [postgres-data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    healthcheck: redis-cli ping

  api:
    build: ./api
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_healthy }
    command: sh -c "npx prisma migrate deploy && node dist/index.js"

  web:
    build: ./web
    depends_on:
      api: { condition: service_healthy }
```

One command, full stack:

```bash
cd src/problem5
cp .env.example .env
docker compose up --build
# Web at http://localhost:3000
# API at http://localhost:4000
# Swagger at http://localhost:4000/docs
```

**Dockerfile shape (both api and web):** three stages. `deps` runs `npm ci`. `build` runs `tsc` for the API or `next build` for web. `runtime` copies only what's needed. API runs `node dist/index.js` after `prisma migrate deploy`. Web uses `next start` against the standalone output.

Image size target: ~150MB each. Cold start for the full stack: ~15s, mostly Postgres warmup.

`08-runbook.md` covers dev mode (no Docker), env vars, common pitfalls, and how to wipe the database.

---

## 11. Testing approach

What I'm testing with vitest + supertest:

- All five task endpoints, happy path.
- All filter combinations on list, including edges (empty filters, conflicting filters, max limit).
- Validation errors on every endpoint that takes input.
- 404 paths.
- Cache invalidation: write then read should not see stale data.

**Test database.** A separate Postgres container in `docker-compose.test.yml`. Each test file truncates the `Task` table in `beforeEach`. I considered transactional rollback (per-test BEGIN/ROLLBACK) but the cache-invalidation tests need real commits to be meaningful. Truncate is fine for the data sizes here.

What I'm not testing:

- The frontend. 16h doesn't fit Cypress or Playwright setup. Manual smoke + `tsc --noEmit` + eslint is the honest answer.
- Prisma's own behavior. I'm not testing that `findMany` returns rows. I'm testing that my service layer builds the right `where` clause.
- Performance. No load tests. The cache + indexes are designed conservatively. If the reviewer asks, I have a paragraph in `12-retrospective.md` about what k6 scenarios I'd run with another day.

`07-testing-strategy.md` has the per-file test list and the test database setup.

---

## 12. Observability and operations

**Logging.** pino for everything. JSON in production, pretty in dev. `pino-http` adds a per-request log line with method, path, status, duration, and `requestId`. The error handler logs at `error` with full stack and `requestId`. No `console.log` anywhere in shipped code. Lint catches it.

**Request ID.** A middleware generates a UUID per request, or honors an inbound `x-request-id` header. The ID attaches to `req.id`, sets a response header, gets included in every log line for the request, and echoes back in error envelopes. The web app also generates an ID for every API call, so a failed user action traces end-to-end.

**Health checks.** `/healthz` is dumb: returns 200 if the process is alive. `/readyz` checks Postgres (`SELECT 1`) and Redis (`PING`); returns 503 if either fails. The Docker healthcheck for the API service uses `/readyz`.

`06-observability.md` goes deeper, including what I'd add (OpenTelemetry traces, Prometheus metrics) for production.

---

## 13. Security posture

Security has its own file at `13-security.md`. The summary:

- helmet defaults plus a tightened CSP for the docs route.
- CORS allowlist driven by `WEB_ORIGIN` env. No `*`.
- Rate limit: 100 req/min per IP global, 30 req/min per IP for mutations. Redis-backed.
- Input validated by Zod before reaching the service layer. No raw `req.body` access anywhere.
- Output shapes are explicit in the controller. No accidental field leaks.
- Secrets are never committed. `.env.example` documents every variable.
- No auth. Documented as an explicit cut below and in `12-retrospective.md`.

---

## 14. Implementation phases

Eight phases. Each one has a single goal and a definition of done. If I'm running over, the cuts come between phases, not inside them.

### Phase 1 — Skeleton (~1.5h)

Init `api/` and `web/` as separate npm projects. TypeScript strict for both. Prisma init, schema written, first migration generated. Docker compose with Postgres and Redis only; verify the API container can connect.

**Done when:** `npx prisma migrate dev` succeeds inside the container and `psql` shows the `Task` table.

### Phase 2 — Backend core (~2.5h)

`core/config/env.ts` with Zod-validated env. `core/lib/{prisma, redis, logger, cache}.ts`. `core/middleware/{request-id, error-handler, validate, rate-limit, not-found}.ts`. `core/errors/http-errors.ts` with `HttpError`, `NotFoundError`, `ValidationError`. `server.ts` `createApp()` factory wiring middleware in the right order. `index.ts` bootstrap with graceful shutdown on SIGTERM/SIGINT. `health/health.routes.ts`.

**Done when:** `curl /healthz` returns 200, `curl /readyz` returns 200, and a forced exception lands in the error envelope with a request ID.

### Phase 3 — Task module (~3h)

`task.schema.ts` (Zod for create, update, list query, params). `task.repository.ts` (Prisma queries, including filter and cursor logic). `task.service.ts` (cache + invalidation). `task.controller.ts` (parse, call service, format response). `task.routes.ts` (wire validate middleware + handlers). `prisma/seed.ts` with ~10 sample tasks across all enum values.

**Done when:** All five endpoints reachable via curl. Manual sanity check on every filter combination.

### Phase 4 — OpenAPI + tests (~2h)

Register every Zod schema with the OpenAPI registry. `/docs` (Swagger UI) and `/openapi.json` routes. Write the test files listed in section 11. Aim for 80%+ coverage on the task module. Coverage is the dial, behavior is the metric.

**Done when:** `npm run test` passes, `/docs` renders, every endpoint visible there matches what the routes file exposes.

### Phase 5 — Frontend skeleton (~2h)

Init `web/` as Next.js 16 + App Router. Tailwind + shadcn init. Install primitives: `button`, `dialog`, `input`, `select`, `popover`, `command`, `badge`, `skeleton`, `tooltip`, `dropdown-menu`. Theme provider + `next-themes`. `lib/api-client.ts`, `lib/query-client.ts`, `lib/utils.ts`. `app/layout.tsx`, `app/page.tsx` (redirect), `app/tasks/page.tsx` (empty shell).

**Done when:** `npm run dev` shows the empty `/tasks` page with header and theme toggle wired.

### Phase 6 — Frontend list + filters (~2.5h)

`task-table.tsx`, `task-row.tsx`, `task-status-badge.tsx`, `task-priority-badge.tsx`. `task-filters-bar.tsx` with URL state via `use-task-filters.ts`. `use-tasks-query.ts` against the live API. Three-state UX. Cursor pagination.

**Done when:** Filtering by status, priority, search, and sort all work end-to-end against the running API.

### Phase 7 — Frontend mutations + polish (~2h)

`task-form-dialog.tsx` for create and edit. `confirm-delete-dialog.tsx`. `use-create-task.ts`, `use-update-task.ts`, `use-delete-task.ts` with optimistic updates. Toast notifications. Final pass on a11y (focus rings, aria labels, keyboard nav for the dialog).

**Done when:** I can create, edit, change status inline, and delete a task without reloading. All mutations show optimistic UI then settle.

### Phase 8 — Docs + Docker polish (~1.5h)

Per-folder READMEs. Fill in the remaining `docs/` files; the hardest ones (`02`, `03`, `11`) should already be most of the way written from this plan. `12-retrospective.md` filled in honestly. Test full `docker compose up` from a clean checkout. Update root `readme.md` with the Problem 5 entry, matching the format of Problems 1–3.

**Done when:** A reviewer who clones the repo can be looking at the running web app within 5 minutes, with no shell errors.

**Phase total: ~17h.** Slightly over the 16h target. I plan with a buffer because Phase 7 polish is what reviewers see, and that's the worst place to run out of time.

---

## 15. What I'm explicitly cutting

Stating these now so I don't drift.

- **No auth.** Brief doesn't ask. Adding even a fake JWT layer pushes API surface to ~8 endpoints, complicates the test harness, and shows nothing the rest of the code doesn't already show. If asked in interview: "I'd add an auth middleware reading a bearer token, plus a `userId` column on `Task`. Maybe 30 minutes."
- **No multi-tenancy.** Same reasoning.
- **No real-time updates.** WebSocket for "task created elsewhere" would be cool but the demo is single-user and I'd be paying with an hour I don't have.
- **No file uploads / attachments.** Same.
- **No email/notifications.** Same.
- **No e2e tests on the frontend.** Manual smoke + typecheck + lint. Documented in `07-testing-strategy.md`.
- **No CI pipeline.** `.github/workflows/ci.yml` would take 30 minutes and look good, but the rest of the repo doesn't have one. Introducing a pattern that only Problem 5 follows is worse than not having one.
- **No Prometheus metrics.** Logging is good. Metrics would be better. Out of scope.

---

## 16. Risks I'm tracking

| Risk | Likelihood | Mitigation |
|---|---|---|
| Prisma + Express 5 type frictions on the error handler signature | Medium | A thin custom `asyncHandler` if needed. I've done this pattern before. |
| OpenAPI generator produces an awkward schema for repeated query params (`status=TODO&status=IN_PROGRESS`) | Medium | Manually annotate the schema with `.openapi()` overrides where the generator gets it wrong. ~30 min. |
| Docker Compose healthcheck timing on cold start delays the API past Web's wait | Low | Increase `start_period` for postgres and redis. Documented. |
| TanStack Query optimistic update + sort change causes visual jank | Low | Keep sort stable across mutations. Re-fetch silently in the background. |
| I run over and have to cut Phase 7 polish | Medium | Phase order is intentional. Cuts come off non-visible work first. |

The OpenAPI docs use Swagger UI generated from the Zod-backed OpenAPI document. I considered Scalar for a more polished reference page, but kept Swagger UI to avoid another UI dependency and keep the API contract closer to the generated spec.

---

## 17. Definition of done

A reviewer who runs `git clone && cd src/problem5 && cp .env.example .env && docker compose up --build` should see:

- [ ] All four containers come up healthy within 30s.
- [ ] `http://localhost:3000` shows the Tasks page with seed data.
- [ ] `http://localhost:4000/docs` renders the API reference with all endpoints.
- [ ] Creating, editing, status-changing, and deleting a task all work from the UI.
- [ ] All API endpoints work from curl per `04-api-spec.md`.
- [ ] `npm run test` in `api/` passes.
- [ ] `npm run typecheck` and `npm run lint` pass in both `api/` and `web/`.
- [ ] Reading `00-implementation-plan.md` and `12-retrospective.md` gives a complete picture.

If all eight check, the submission is done.

---

## 18. Companion docs

| File | Purpose |
|---|---|
| `01-overview.md` | Problem brief, scope, success criteria. |
| `02-architecture.md` | Layer-by-layer breakdown, request flow diagrams. |
| `03-data-model.md` | Prisma schema deep-dive, indexing rationale. |
| `04-api-spec.md` | Full REST contract with curl examples. |
| `05-frontend-design.md` | Page composition, components, hooks, motion. |
| `06-observability.md` | Logging, request-id flow, health checks. |
| `07-testing-strategy.md` | Per-file test list, what's not tested. |
| `08-runbook.md` | Run with Docker or dev, env, troubleshooting. |
| `09-tasks.md` | Phased build plan, expanded from §14. |
| `10-subtasks.md` | Granular checklist for use during implementation. |
| `11-decisions.md` | ADR-style log of every non-obvious choice. |
| `12-retrospective.md` | Drafted before build, updated after. |
| `13-security.md` | Helmet, CORS, rate limiting, what production would add. |

I'm writing `12-retrospective.md` twice. Once before code (predicted cuts), once after (actual cuts). Two reasons in one sentence: estimation is a skill worth showing the work on, and being wrong out loud is more honest than being right in retrospect.

---

End of plan. Current run and verification steps live in `README.md` and `docs/08-runbook.md`.
