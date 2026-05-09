# Subtasks (Working Checklist)

> The checkbox version of `09-tasks.md`. I tick boxes here as I build. If you're a reviewer and the boxes don't match what's shipped, the truth is the code, not this file.

## Phase 1 — Skeleton

### Folder + tooling

- [ ] `src/problem5/api/package.json` (name, type=module, scripts: dev, build, start, lint, test, typecheck, db:seed)
- [ ] `src/problem5/api/tsconfig.json` (strict, target ES2022, moduleResolution bundler)
- [ ] `src/problem5/api/.gitignore`, `.dockerignore`
- [ ] `src/problem5/api/.eslintrc.cjs` (or `eslint.config.js`)
- [ ] `src/problem5/web/` via `npx create-next-app@latest --ts --tailwind --eslint --app --no-src-dir`
- [ ] `src/problem5/web/.dockerignore`
- [ ] Root `src/problem5/.env.example` (every variable from `08-runbook.md`)
- [ ] Root `src/problem5/.gitignore` (covers both packages' build output)

### API dependencies

- [ ] runtime: express, @prisma/client, ioredis, zod, pino, pino-http, helmet, cors, compression, express-rate-limit, rate-limit-redis, @asteasolutions/zod-to-openapi, swagger-ui-express
- [ ] dev: typescript, tsx, prisma, vitest, supertest, @types/* for express/cors/compression/supertest, pino-pretty, eslint, @typescript-eslint/*, prettier
- [ ] `npx prisma init`
- [ ] Replace `schema.prisma` with the canonical version from `03-data-model.md`

### Web dependencies

- [ ] runtime: @tanstack/react-query, react-hook-form, @hookform/resolvers, zod, framer-motion, lucide-react, sonner, next-themes, date-fns
- [ ] shadcn primitives via `npx shadcn@latest add ...` (button, dialog, input, textarea, select, popover, calendar, command, badge, skeleton, tooltip, dropdown-menu, separator, sheet)

### Docker

- [ ] `docker-compose.yml` with services: postgres (16-alpine), redis (7-alpine). Healthchecks. Named volumes.
- [ ] `docker compose up -d postgres redis` succeeds.

### First migration

- [ ] `npx prisma migrate dev --name init` succeeds
- [ ] `psql` shows the `Task` table with all columns + indexes from §03

## Phase 2 — Backend core

### Config + lib

- [ ] `core/config/env.ts` — Zod schema, throws on parse failure
- [ ] `core/lib/prisma.ts` — singleton, log query in dev, beforeExit handler
- [ ] `core/lib/redis.ts` — ioredis with retry strategy, error logging
- [ ] `core/lib/logger.ts` — pino, transport differs by NODE_ENV
- [ ] `core/lib/cache.ts` — get / set / getOrSet / invalidatePrefix; each catches Redis errors

### Errors

- [ ] `core/errors/http-errors.ts` — `HttpError` (base), `NotFoundError`, `ValidationError`, `RateLimitError`, `DependencyError`

### Middleware

- [ ] `core/middleware/request-id.ts`
- [ ] `core/middleware/error-handler.ts` — maps known error classes, generic 500 fallback, requestId in body
- [ ] `core/middleware/validate.ts` — generic `validate(schema, source = 'body')`
- [ ] `core/middleware/rate-limit.ts` — global + mutation-specific limiters via rate-limit-redis
- [ ] `core/middleware/not-found.ts` — 404 envelope for unmatched routes

### Server

- [ ] `server.ts` — `createApp()`. Wires middleware in pinned order.
- [ ] `index.ts` — bootstrap. SIGTERM/SIGINT handler closes Prisma + Redis before exit.
- [ ] `modules/health/health.routes.ts` — `/healthz`, `/readyz`
- [ ] Debug-only `__debug-throw` route gated by `NODE_ENV !== 'production'` for the error envelope smoke test (remove or keep gated; decide before Phase 8)

### Verification

- [ ] `curl /healthz` → 200
- [ ] `curl /readyz` → 200 with both checks ok
- [ ] Stop Postgres → `/readyz` → 503; restart → 200
- [ ] Force exception → 500 envelope with requestId, no stack in body, full stack in logs

## Phase 3 — Task module

### Schemas

- [ ] `modules/task/task.schema.ts` — Task, createTaskSchema, updateTaskSchema, listTaskQuerySchema, taskIdParamSchema
- [ ] All schemas exported with their inferred types
- [ ] Tag normalization (lowercase + dedupe + max 20) in the schema, not the controller

### Repository

- [ ] `task.repository.ts` — create
- [ ] findById
- [ ] findMany — with the full filter/sort/cursor logic
- [ ] update
- [ ] delete
- [ ] cursor encode/decode helpers
- [ ] filter-to-where translator (the trickiest pure function in the API; deserves a dedicated unit test)

### Service

- [ ] `task.service.ts` — create (invalidates list)
- [ ] list (cache.getOrSet with 30s TTL)
- [ ] getById (cache.getOrSet with 60s TTL on item key)
- [ ] update (invalidates item + list)
- [ ] delete (invalidates item + list)

### Controller + routes

- [ ] `task.controller.ts` — five handlers
- [ ] ETag header on getById response
- [ ] If-None-Match handling on getById
- [ ] `task.routes.ts` — paths + validate middleware per route
- [ ] Wire `task.routes` into `createApp()`

### Seed

- [ ] `prisma/seed.ts` — ~10 tasks across all status + priority combinations
- [ ] Idempotent (upsert by stable key)
- [ ] `npm run db:seed` script in package.json

### Verification (curl pass)

- [ ] POST happy path → 201
- [ ] POST with invalid body → 400 with details
- [ ] GET list (no filters) → seeded data
- [ ] GET list with single status filter → filtered
- [ ] GET list with multi status → union
- [ ] GET list with priority + status → intersection
- [ ] GET list with q="..." → ILIKE match
- [ ] GET list with limit + cursor pagination → next page
- [ ] GET by id → 200
- [ ] GET by id (missing) → 404
- [ ] PATCH → 200 with updated row
- [ ] PATCH (missing id) → 404
- [ ] PATCH (empty body) → 400
- [ ] DELETE → 204
- [ ] DELETE (already gone) → 404
- [ ] After mutation, list reflects change without TTL wait

## Phase 4 — OpenAPI + tests

### OpenAPI

- [ ] `core/openapi/registry.ts` — extend Zod, register every schema
- [ ] Document path operations for the five task routes + health
- [ ] `core/openapi/docs.routes.ts` — `/docs` (Swagger UI), `/openapi.json`
- [ ] Manually annotate any schema the generator gets wrong (multi-value query params)
- [ ] Open `/docs` and click through every endpoint

### Test setup

- [ ] `docker-compose.test.yml` with postgres-test (tmpfs) and redis-test
- [ ] `vitest.config.ts` with globalSetup that runs `prisma migrate deploy` on the test DB
- [ ] `tests/helpers/test-app.ts` — builds app with test connections
- [ ] Per-file `beforeEach` truncates `Task`

### Test files (per `07-testing-strategy.md`)

- [ ] `tests/task.create.test.ts`
- [ ] `tests/task.list.filters.test.ts`
- [ ] `tests/task.read.test.ts`
- [ ] `tests/task.update.test.ts`
- [ ] `tests/task.delete.test.ts`
- [ ] `tests/cache.invalidation.test.ts`
- [ ] `tests/unit/cache-key.test.ts`
- [ ] `tests/unit/cursor.test.ts`
- [ ] `tests/smoke/health.test.ts`
- [ ] `tests/smoke/openapi.test.ts`
- [ ] `tests/smoke/error.test.ts`
- [ ] Coverage ≥ 80% lines on the task module

## Phase 5 — Frontend skeleton

### App shell

- [ ] `app/layout.tsx` — providers (ThemeProvider, QueryClientProvider, Toaster), Geist font
- [ ] `app/globals.css` — base + theme tokens (copy from wallet-app)
- [ ] `app/page.tsx` — `redirect('/tasks')`
- [ ] `app/tasks/page.tsx` — empty shell with header + "+ New task" button (placeholder)

### Lib

- [ ] `lib/utils.ts` — `cn` (shadcn copy)
- [ ] `lib/query-client.ts` — QueryClient with sensible defaults
- [ ] `lib/api-client.ts` — typed fetch wrapper, request id per call, parses success/error envelopes
- [ ] `lib/format-date.ts`

### Components

- [ ] `components/ui/*` — shadcn-installed primitives
- [ ] `components/theme-toggle.tsx`

### Verification

- [ ] `npm run dev` — `/` redirects to `/tasks`, header + theme toggle render, no console errors

## Phase 6 — Frontend list + filters

### Schemas + types

- [ ] `schemas/task.ts` — mirror of API Zod schemas
- [ ] `types/task.ts` — inferred types

### Hooks

- [ ] `hooks/use-task-filters.ts` — URL ↔ object, debounced `q`
- [ ] `hooks/use-tasks-query.ts` — TanStack Query
- [ ] `hooks/use-task-query.ts` — single by id (used by detail dialog)

### Components

- [ ] `task-status-badge.tsx`
- [ ] `task-priority-badge.tsx`
- [ ] `task-row.tsx` — row layout, inline status dropdown
- [ ] `task-table.tsx` — header, body, four states
- [ ] `task-filters-bar.tsx` — search, three filters, sort, active filter chips
- [ ] `empty-state.tsx`
- [ ] `error-state.tsx`

### Wiring

- [ ] `app/tasks/page.tsx` composes filters bar + table
- [ ] Pagination "Load more" appends without re-fetching everything (TanStack `setQueryData`)

### Verification

- [ ] Filter by status → only matching rows
- [ ] Filter by priority → only matching rows
- [ ] Search "invoice" → matches title and description
- [ ] Sort each column asc + desc
- [ ] Refresh — same view (URL-driven)
- [ ] Disconnect API — error state with retry; retry works after reconnect

## Phase 7 — Frontend mutations + polish

### Hooks

- [x] `use-create-task.ts` — optimistic prepend
- [x] `use-update-task.ts` — optimistic patch in place
- [x] `use-delete-task.ts` — optimistic remove

### Components

- [x] `task-form-dialog.tsx` — RHF + zodResolver, modes create + edit
- [x] Tag input (simple version per `05-frontend-design.md`)
- [x] `confirm-delete-dialog.tsx` — two-step

### Wiring

- [x] "+ New task" → form dialog (create)
- [x] Row menu → Edit → form dialog (edit)
- [x] Row menu → Delete → confirm → delete
- [x] Inline status dropdown commits immediately
- [x] Toasts on success + error for each mutation

### Polish

- [x] framer-motion row enter/exit
- [x] Tab through every interactive element — focus rings preserved
- [x] Dialog focus trap works (Radix should handle)
- [x] aria-label on every icon-only button
- [x] Live region on toast container
- [x] Mobile breakpoint: cards instead of table, filter sheet

## Phase 8 — Docs + Docker polish

### Docker

- [ ] `api/Dockerfile` — multi-stage, ~150MB target
- [ ] `web/Dockerfile` — multi-stage with `output: 'standalone'`
- [ ] Add `api` and `web` services to compose with healthchecks
- [ ] `depends_on` with `condition: service_healthy`
- [ ] Test cold rebuild: `docker compose down -v && docker compose up --build`

### Docs

- [ ] `src/problem5/README.md` — quickstart + link to `docs/00-implementation-plan.md`
- [ ] `api/README.md`
- [ ] `web/README.md`
- [ ] `12-retrospective.md` — fill in actuals
- [ ] Update root `99_code_challenge/readme.md` with the Problem 5 entry

### Final acceptance (per §17 of plan)

- [ ] All four containers healthy ≤30s
- [ ] `/tasks` page renders seed data
- [ ] `/docs` renders all endpoints
- [ ] Create / edit / status-change / delete from UI
- [ ] All curl commands from `04-api-spec.md` work
- [ ] `npm run test` passes in `api/`
- [ ] `npm run typecheck` and `npm run lint` pass in both packages
- [ ] Reading `00-implementation-plan.md` + `12-retrospective.md` gives the full picture
