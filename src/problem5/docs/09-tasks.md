# Tasks (Phased Build Plan)

> Expansion of `00-implementation-plan.md` §14. Each phase has a goal, the steps to get there, and a single explicit "done when" check. The granular per-file checklist lives in `10-subtasks.md`.

## How to read this file

If I'm building, I'm in one phase at a time. The order isn't strictly necessary, but it's the order that minimizes blocked work — backend before frontend (so the frontend has something to fetch from), tests after the module they cover (so the test isn't a moving target), Docker polish last (because it's the integration check on everything else).

## Phase 1 — Skeleton (~1.5h)

**Goal:** Both `api/` and `web/` exist as valid npm projects. Postgres and Redis come up via Docker. The Task table exists.

**Steps**

1. Create `api/` and `web/` folders with `package.json`, `tsconfig.json`, `.gitignore`, `.dockerignore`.
2. `api/`: install Express 5, TypeScript, tsx, Prisma, ioredis, Zod, pino, helmet, cors, compression, vitest, supertest. Pin to current major versions.
3. `web/`: `npx create-next-app@latest` with App Router, Tailwind, src dir off, TS strict on. Install shadcn CLI + components, TanStack Query, RHF, framer-motion, lucide-react, sonner, next-themes.
4. `api/prisma/schema.prisma`: paste from `03-data-model.md`. Generate the client (`npx prisma generate`).
5. Write `docker-compose.yml` with `postgres` and `redis` services and named volumes. No `api` or `web` services yet.
6. `docker compose up -d postgres redis`. Run `npx prisma migrate dev --name init`.
7. `psql` into Postgres and confirm the `Task` table exists.

**Done when:**

```bash
docker compose exec postgres psql -U postgres -d tasks -c '\dt'
# Should list: Task, _prisma_migrations
```

## Phase 2 — Backend core (~2.5h)

**Goal:** Bare server boots, errors come back in the right shape, request-id flows, health endpoints work.

**Steps**

1. `core/config/env.ts`: Zod schema for env vars; throws on boot if anything's missing.
2. `core/lib/prisma.ts`: singleton, with graceful disconnect on SIGTERM.
3. `core/lib/redis.ts`: ioredis client with retry strategy.
4. `core/lib/logger.ts`: pino instance, dev pretty / prod json.
5. `core/lib/cache.ts`: `get`, `set`, `getOrSet`, `invalidatePrefix`. Each catches Redis errors and degrades gracefully (logged at warn).
6. `core/middleware/`: `request-id`, `error-handler`, `validate`, `rate-limit`, `not-found` per `02-architecture.md`.
7. `core/errors/http-errors.ts`: `HttpError` base, `NotFoundError`, `ValidationError`, `RateLimitError`, `DependencyError`. Each carries `statusCode` and `code`.
8. `server.ts`: `createApp()` factory. Wires middleware in the order pinned in `02-architecture.md`. Returns the app.
9. `index.ts`: bootstrap. Calls `createApp()`, listens, handles SIGTERM/SIGINT for graceful shutdown.
10. `modules/health/health.routes.ts`: `/healthz` (always 200), `/readyz` (pings Postgres + Redis).
11. Throw a forced exception from a debug route to verify the error envelope.

**Done when:**

```bash
curl -i http://localhost:4000/healthz   # 200
curl -i http://localhost:4000/readyz    # 200
curl -i http://localhost:4000/__debug-throw   # 500 envelope, has requestId
```

## Phase 3 — Task module (~3h)

**Goal:** All five CRUD endpoints work end-to-end. Filters and cursor pagination functional. Cache wired in.

**Steps**

1. `task.schema.ts`: Zod schemas for `Task`, `createTaskSchema`, `updateTaskSchema`, `listTaskQuerySchema`, `taskIdParamSchema`. Schemas are the source of truth; types are inferred.
2. `task.repository.ts`: `create`, `findById`, `findMany(filters)`, `update`, `delete`. The filter-to-Prisma-where translation lives here. Cursor encode/decode helpers in this file.
3. `task.service.ts`: same surface, with cache wrapping. `create`/`update`/`delete` invalidate the appropriate keys.
4. `task.controller.ts`: parse req shape, call service, format response envelope, set status codes, set ETag on single-item read.
5. `task.routes.ts`: bind paths, attach `validate(schema)` middleware per route.
6. `prisma/seed.ts`: ~10 tasks across status/priority combinations. Idempotent.
7. Wire `task.routes` into `createApp()`.
8. Manual sanity check via curl on every endpoint and every filter.

**Done when:**

- Each curl in `04-api-spec.md` returns the documented response.
- A list call followed by a create followed by another list shows the new task without staleness.

> Open: I haven't decided whether the cursor for non-default sorts ships in this phase or moves to a stretch. If Phase 3 hits the 3h mark, default-sort-only ships and the stretch is documented in `12-retrospective.md`.

## Phase 4 — OpenAPI + tests (~2h)

**Goal:** `/docs` renders. Test suite passes with reasonable coverage.

**Steps**

1. `core/openapi/registry.ts`: register every Zod schema with `@asteasolutions/zod-to-openapi`.
2. `core/openapi/docs.routes.ts`: `/docs` (Swagger UI HTML) and `/openapi.json`.
3. Hand-tune any schema that the generator produces awkwardly (multi-value enum query params are the usual offender).
4. `tests/helpers/test-app.ts`: builds the app for tests, with a connection to the test Postgres + Redis.
5. Write the test files listed in `07-testing-strategy.md`.
6. Run coverage. If it's well below 80% on the task module, look at what's not covered and decide whether it should be (often the answer is "no, that's fine").

**Done when:**

- `npm run test` passes.
- `/docs` loads at `http://localhost:4000/docs` and lists every endpoint that exists in `task.routes` and `health.routes`.
- `/openapi.json` validates against the OpenAPI 3.1 schema.

## Phase 5 — Frontend skeleton (~2h)

**Goal:** Empty `/tasks` page, theme toggle, providers in place. No data yet.

**Steps**

1. `web/`: install shadcn primitives I'll need: `button`, `dialog`, `input`, `textarea`, `select`, `popover`, `calendar`, `command`, `badge`, `skeleton`, `tooltip`, `dropdown-menu`, `separator`, `sheet`.
2. `app/layout.tsx`: providers — `ThemeProvider`, `QueryClientProvider`, `Toaster`. Fonts (Geist).
3. `app/page.tsx`: `redirect('/tasks')`.
4. `app/tasks/page.tsx`: shell with header, theme toggle, "+ New task" button (opens dialog placeholder).
5. `lib/api-client.ts`: typed wrapper around `fetch`. Reads `NEXT_PUBLIC_API_URL`. Generates a request id per call, sets `x-request-id`.
6. `lib/query-client.ts`: `QueryClient` with sensible defaults (`staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`).
7. `lib/utils.ts`: `cn`, copied from shadcn.
8. `lib/format-date.ts`: thin wrapper around `Intl.DateTimeFormat`. Used by both rows and the form's date popover.
9. Theme toggle component, copied from `wallet-app`.

**Done when:** `npm run dev` shows `/tasks` with header, theme toggle, an empty body, no console errors.

## Phase 6 — Frontend list + filters (~2.5h)

**Goal:** The table renders real data with all filters working.

**Steps**

1. `schemas/task.ts` and `types/task.ts`: mirror the API schemas (see `11-decisions.md` for why duplicated).
2. `hooks/use-task-filters.ts`: read/write URL search params, return `TaskFilters`. Debounced `q` (300ms).
3. `hooks/use-tasks-query.ts`: TanStack Query against `apiClient.tasks.list(filters)`.
4. `components/task-status-badge.tsx`, `task-priority-badge.tsx`: pure render.
5. `components/task-row.tsx`: row layout. Inline status dropdown (calls `useUpdateTask`).
6. `components/task-table.tsx`: header, body, the four states (loading, refetching, error, empty). "Load more" button.
7. `components/task-filters-bar.tsx`: search input, three filter dropdowns, sort dropdown. Active filter chips with ✕ to remove.
8. `components/empty-state.tsx`, `error-state.tsx`.
9. Wire it all into `app/tasks/page.tsx`.

**Done when:** With the API running and seeded, I can:
- Filter by status, priority, search query.
- Sort by each allowed column, asc and desc.
- Click "Load more" and see the next page.
- Refresh the page and see the same filtered view (URL-driven).

## Phase 7 — Frontend mutations + polish (~2h)

**Goal:** Full CRUD from the UI. Optimistic updates, toasts, a11y pass.

**Steps**

1. `components/task-form-dialog.tsx`: RHF + zodResolver. Modes `create` and `edit`. Tag input (start simple per `05-frontend-design.md`).
2. `hooks/use-create-task.ts`, `use-update-task.ts`, `use-delete-task.ts`: optimistic updates with rollback on error.
3. `components/confirm-delete-dialog.tsx`: two-step delete.
4. Wire "+ New task" button → open dialog in create mode.
5. Wire row menu → "Edit" opens dialog in edit mode, "Delete" opens confirm dialog.
6. Inline status dropdown on each row: changes commit immediately with optimistic update.
7. Toasts (sonner) for success and error on each mutation.
8. Motion: row enter/exit per `05-frontend-design.md`.
9. A11y pass: Tab through every interactive element. Verify focus rings, dialog focus trap, status badge `aria-label`, live region on toaster.

**Done when:**

- I can create, edit, delete a task without page reload.
- An inline status change updates the row instantly, with a toast confirming.
- A network failure rolls the optimistic update back and toasts an error.
- Tab navigation works end-to-end with no missing focus rings.

## Phase 8 — Docs + Docker polish (~1.5h)

**Goal:** A reviewer who clones cold reaches a running app in 5 minutes.

**Steps**

1. Add the `api` and `web` services to `docker-compose.yml`. Healthchecks. `depends_on` with `condition: service_healthy`.
2. Write `api/Dockerfile` (multi-stage, target ~150MB).
3. Write `web/Dockerfile` (multi-stage with `output: 'standalone'`).
4. `.env.example` for the root with all variables documented.
5. `src/problem5/README.md`: quickstart, link to `docs/00-implementation-plan.md`.
6. `api/README.md`, `web/README.md`: package-level READMEs in the same shape as `wallet-app/README.md`.
7. Test from a cold checkout: delete `node_modules` everywhere, drop the postgres volume, `docker compose up --build`. Time it.
8. Update root `99_code_challenge/readme.md` with the Problem 5 entry, matching the format used for Problems 1–3.
9. Fill in `12-retrospective.md` with what actually happened versus this plan.

**Done when:**

```bash
git clone <repo>
cd 99_code_challenge/src/problem5
cp .env.example .env
docker compose up --build
# Open http://localhost:3000 within 5 minutes of starting compose
```

…and everything in `00-implementation-plan.md` §17 (Definition of Done) checks out.

## Time totals

| Phase | Estimate | Cumulative |
|---|---:|---:|
| 1. Skeleton | 1.5h | 1.5h |
| 2. Backend core | 2.5h | 4.0h |
| 3. Task module | 3.0h | 7.0h |
| 4. OpenAPI + tests | 2.0h | 9.0h |
| 5. Frontend skeleton | 2.0h | 11.0h |
| 6. Frontend list + filters | 2.5h | 13.5h |
| 7. Frontend mutations + polish | 2.0h | 15.5h |
| 8. Docs + Docker polish | 1.5h | 17.0h |

17h is 1h over the 16h target. The buffer is intentional — Phase 7 polish is what reviewers see, and that's the worst place to discover I'm out of time. If I have to cut, the order is documented in `00-implementation-plan.md` §15 and the actual cut order goes in `12-retrospective.md`.

## What I'll do if I'm running long

In order of "cut first":

1. Skip the upgraded tag input. Plain text input + comma-to-commit.
2. Drop the smoke `error.test.ts`. Behavior is exercised by integration tests anyway.
3. Drop the `[id]/page.tsx` detail route. Dialog covers everything.
4. Cursor pagination only on default sort. Custom sorts use offset.
5. Skip the framer-motion row enter/exit. Defaults are fine.

The line I won't cross: the API contract and the Docker quickstart. Those are what the reviewer actually evaluates.
