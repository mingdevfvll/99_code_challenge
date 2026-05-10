# Subtasks (Working Checklist)

> The checkbox version of `09-tasks.md`. I tick boxes here as I build. If you're a reviewer and the boxes don't match what's shipped, the truth is the code, not this file.

## Phase 1 — Skeleton

### Folder + tooling

- [x] `src/problem5/api/package.json` (name, type=module, scripts: dev, build, start, lint, test, typecheck, db:seed)
- [x] `src/problem5/api/tsconfig.json` (strict, target ES2022, moduleResolution bundler)
- [x] `src/problem5/api/.gitignore`, `.dockerignore`
- [x] `src/problem5/api/.eslintrc.cjs` (or `eslint.config.js`)
- [x] `src/problem5/web/` via `npx create-next-app@latest --ts --tailwind --eslint --app --no-src-dir`
- [x] `src/problem5/web/.dockerignore`
- [x] Root `src/problem5/.env.example` (every variable from `08-runbook.md`)
- [x] Root `src/problem5/.gitignore` (covers both packages' build output)

### API dependencies

- [x] runtime: express, @prisma/client, ioredis, zod, pino, pino-http, helmet, cors, compression, express-rate-limit, rate-limit-redis, @asteasolutions/zod-to-openapi, swagger-ui-express
- [x] dev: typescript, tsx, prisma, vitest, supertest, @types/* for express/cors/compression/supertest, pino-pretty, eslint, @typescript-eslint/*, prettier
- [x] `npx prisma init`
- [x] Replace `schema.prisma` with the canonical version from `03-data-model.md`

### Web dependencies

- [x] runtime: @tanstack/react-query, react-hook-form, @hookform/resolvers, zod, framer-motion, lucide-react, sonner, next-themes, date-fns
- [x] shadcn primitives via `npx shadcn@latest add ...` (button, dialog, input, textarea, select, popover, calendar, command, badge, skeleton, tooltip, dropdown-menu, separator, sheet)

### Docker

- [x] `docker-compose.yml` with services: postgres (16-alpine), redis (7-alpine). Healthchecks. Named volumes.
- [x] `docker compose up -d postgres redis` succeeds.

### First migration

- [x] `npx prisma migrate dev --name init` succeeds
- [x] `psql` shows the `Task` table with all columns + indexes from §03

## Phase 2 — Backend core

### Config + lib

- [x] `core/config/env.ts` — Zod schema, throws on parse failure
- [x] `core/lib/prisma.ts` — singleton, log query in dev, beforeExit handler
- [x] `core/lib/redis.ts` — ioredis with retry strategy, error logging
- [x] `core/lib/logger.ts` — pino, transport differs by NODE_ENV
- [x] `core/lib/cache.ts` — get / set / getOrSet / invalidatePrefix; each catches Redis errors

### Errors

- [x] `core/errors/http-errors.ts` — `HttpError` (base), `NotFoundError`, `ValidationError`, `RateLimitError`, `DependencyError`

### Middleware

- [x] `core/middleware/request-id.ts`
- [x] `core/middleware/error-handler.ts` — maps known error classes, generic 500 fallback, requestId in body
- [x] `core/middleware/validate.ts` — generic `validate(schema, source = 'body')`
- [x] `core/middleware/rate-limit.ts` — global + mutation-specific limiters via rate-limit-redis
- [x] `core/middleware/not-found.ts` — 404 envelope for unmatched routes

### Server

- [x] `server.ts` — `createApp()`. Wires middleware in pinned order.
- [x] `index.ts` — bootstrap. SIGTERM/SIGINT handler closes Prisma + Redis before exit.
- [x] `modules/health/health.routes.ts` — `/healthz`, `/readyz`
- [x] Debug-only `__debug-throw` route gated by `NODE_ENV !== 'production'` for the error envelope smoke test

### Verification

- [x] `curl /healthz` → 200
- [x] `curl /readyz` → 200 with both checks ok
- [x] Stop Postgres → `/readyz` → 503; restart → 200
- [x] Force exception → 500 envelope with requestId, no stack in body, full stack in logs

## Phase 3 — Task module

### Schemas

- [x] `modules/task/task.schema.ts` — Task, createTaskSchema, updateTaskSchema, listTaskQuerySchema, taskIdParamSchema
- [x] All schemas exported with their inferred types
- [x] Tag normalization (lowercase + dedupe + max 20) in the schema, not the controller

### Repository

- [x] `task.repository.ts` — create
- [x] findById
- [x] findMany — with the full filter/sort/cursor logic
- [x] update
- [x] delete
- [x] cursor encode/decode helpers
- [x] filter-to-where translator (the trickiest pure function in the API; deserves a dedicated unit test)

### Service

- [x] `task.service.ts` — create (invalidates list)
- [x] list (cache.getOrSet with 30s TTL)
- [x] getById (cache.getOrSet with 60s TTL on item key)
- [x] update (invalidates item + list)
- [x] delete (invalidates item + list)

### Controller + routes

- [x] `task.controller.ts` — five handlers
- [x] ETag header on getById response
- [x] If-None-Match handling on getById
- [x] `task.routes.ts` — paths + validate middleware per route
- [x] Wire `task.routes` into `createApp()`

### Seed

- [x] `prisma/seed.ts` — ~10 tasks across all status + priority combinations
- [x] Idempotent (upsert by stable key)
- [x] `npm run db:seed` script in package.json

### Verification (curl pass)

- [x] POST happy path → 201
- [x] POST with invalid body → 400 with details
- [x] GET list (no filters) → seeded data
- [x] GET list with single status filter → filtered
- [x] GET list with multi status → union
- [x] GET list with priority + status → intersection
- [x] GET list with q="..." → ILIKE match
- [x] GET list with limit + cursor pagination → next page
- [x] GET by id → 200
- [x] GET by id (missing) → 404
- [x] PATCH → 200 with updated row
- [x] PATCH (missing id) → 404
- [x] PATCH (empty body) → 400
- [x] DELETE → 204
- [x] DELETE (already gone) → 404
- [x] After mutation, list reflects change without TTL wait

## Phase 4 — OpenAPI + tests

### OpenAPI

- [x] `core/openapi/registry.ts` — extend Zod, register every schema
- [x] Document path operations for the five task routes + health
- [x] `core/openapi/docs.routes.ts` — `/docs` (Swagger UI), `/openapi.json`
- [x] Manually annotate any schema the generator gets wrong (multi-value query params)
- [x] Open `/docs` and click through every endpoint

### Test setup

- [x] `docker-compose.test.yml` with postgres-test (tmpfs) and redis-test
- [x] `vitest.config.ts` with globalSetup that runs `prisma migrate deploy` on the test DB
- [x] `tests/helpers/test-app.ts` — builds app with test connections
- [x] Per-file `beforeEach` truncates `Task`

### Test files (per `07-testing-strategy.md`)

- [x] `tests/task.create.test.ts`
- [x] `tests/task.list.filters.test.ts`
- [x] `tests/task.read.test.ts`
- [x] `tests/task.update.test.ts`
- [x] `tests/task.delete.test.ts`
- [x] `tests/cache.invalidation.test.ts`
- [x] `tests/unit/cache-key.test.ts`
- [x] `tests/unit/cursor.test.ts`
- [x] `tests/smoke/health.test.ts`
- [x] `tests/smoke/openapi.test.ts`
- [x] `tests/smoke/error.test.ts`
- [x] Coverage ≥ 80% lines on the task module

## Phase 5 — Frontend skeleton

### App shell

- [x] `app/layout.tsx` — providers (ThemeProvider, QueryClientProvider, Toaster), Geist font
- [x] `app/globals.css` — base + theme tokens (copy from wallet-app)
- [x] `app/page.tsx` — `redirect('/tasks')`
- [x] `app/tasks/page.tsx` — empty shell with header + "+ New task" button (placeholder)

### Lib

- [x] `lib/utils.ts` — `cn` (shadcn copy)
- [x] `lib/query-client.ts` — QueryClient with sensible defaults
- [x] `lib/api-client.ts` — typed fetch wrapper, request id per call, parses success/error envelopes
- [x] `lib/format-date.ts`

### Components

- [x] `components/ui/*` — shadcn-installed primitives
- [x] `components/theme-toggle.tsx`

### Verification

- [x] `npm run dev` — `/` redirects to `/tasks`, header + theme toggle render, no console errors

## Phase 6 — Frontend list + filters

### Schemas + types

- [x] `schemas/task.ts` — mirror of API Zod schemas
- [x] `types/task.ts` — inferred types

### Hooks

- [x] `hooks/use-task-filters.ts` — URL ↔ object, debounced `q`
- [x] `hooks/use-tasks-query.ts` — TanStack Query
- [x] `hooks/use-task-query.ts` — single by id (used by detail dialog)

### Components

- [x] `task-status-badge.tsx`
- [x] `task-priority-badge.tsx`
- [x] `task-row.tsx` — row layout, inline status dropdown
- [x] `task-table.tsx` — header, body, four states
- [x] `task-filters-bar.tsx` — search, three filters, sort, active filter chips
- [x] `empty-state.tsx`
- [x] `error-state.tsx`

### Wiring

- [x] `app/tasks/page.tsx` composes filters bar + table
- [x] Pagination "Load more" appends without re-fetching everything (TanStack `setQueryData`)

### Verification

- [x] Filter by status → only matching rows
- [x] Filter by priority → only matching rows
- [x] Search "invoice" → matches title and description
- [x] Sort each column asc + desc
- [x] Refresh — same view (URL-driven)
- [x] Disconnect API — error state with retry; retry works after reconnect

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

- [x] `api/Dockerfile` — multi-stage, ~150MB target
- [x] `web/Dockerfile` — multi-stage with `output: 'standalone'`
- [x] Add `api` and `web` services to compose with healthchecks
- [x] `depends_on` with `condition: service_healthy`
- [x] Test cold rebuild: `docker compose down -v && docker compose up --build`

### Docs

- [x] `src/problem5/README.md` — quickstart + link to `docs/00-implementation-plan.md`
- [x] `api/README.md`
- [x] `web/README.md`
- [x] `12-retrospective.md` — fill in actuals
- [x] Update root `99_code_challenge/readme.md` with the Problem 5 entry

### Final acceptance (per §17 of plan)

- [x] All four containers healthy ≤30s
- [x] `/tasks` page renders seed data
- [x] `/docs` renders all endpoints
- [x] Create / edit / status-change / delete from UI
- [x] All curl commands from `04-api-spec.md` work
- [x] `npm run test` passes in `api/`
- [x] `npm run typecheck` and `npm run lint` pass in both packages
- [x] Reading `00-implementation-plan.md` + `12-retrospective.md` gives the full picture
