# Testing Strategy

> What I'm testing, what I'm not, and the test database setup.

## Stack

- **vitest** for the runner. Fast cold start, watch mode I trust, tap-style output.
- **supertest** for HTTP integration. Boring, obvious, well-documented.
- **A real Postgres** in a sibling Docker container, not an in-memory mock. The query layer is the thing I'm testing; faking it gives me no signal.

## Test taxonomy

I'm being explicit about which kind of test each file is. Mixing layers in a single file gets messy fast.

| Type | Where | What it covers |
|---|---|---|
| Integration (HTTP) | `tests/task.*.test.ts` | The full middleware → controller → service → repository chain against a real DB. The bulk of the suite. |
| Unit | `tests/unit/*.test.ts` | Pure functions: cache key builder, cursor encoder, filter-to-where mapper. Each in isolation. |
| Smoke | `tests/smoke/*.test.ts` | Health endpoints, OpenAPI doc renders, error handler shape. |

There are no frontend tests. Reasoning is in `00-implementation-plan.md` §15 and below.

## Test database

A separate Postgres container in `docker-compose.test.yml`:

```yaml
services:
  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: tasks_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    tmpfs:
      - /var/lib/postgresql/data    # in-memory, no disk I/O
    ports: ['5433:5432']
```

`tmpfs` makes the test DB ephemeral and fast — a fresh container starts in ~1.5s on my machine.

Setup flow:

1. `vitest` starts.
2. `globalSetup` runs `prisma migrate deploy` against `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/tasks_test`.
3. Each test file's `beforeEach` truncates the `Task` table: `await prisma.$executeRaw\`TRUNCATE TABLE "Task" RESTART IDENTITY CASCADE\``.
4. Each test seeds only what it needs.
5. `globalTeardown` is a no-op; the container goes away when compose stops.

I considered transactional rollback (per-test `BEGIN ... ROLLBACK`) and rejected it. Two reasons. Cache invalidation tests rely on real commits to be meaningful; rolling back hides the very thing I'm verifying. And TRUNCATE on an empty-ish table is fast enough that the savings don't matter.

## Per-file test list

### `tests/task.create.test.ts`

- creates a task with full payload → 201, body matches input
- creates a task with only required fields → 201, defaults applied
- empty title → 400 with `VALIDATION_ERROR`
- title over 200 chars → 400
- bad status enum value → 400
- bad ISO date string → 400
- 21+ tags → 400
- create twice with same title → both succeed (no uniqueness)
- response body includes a `requestId`-correlated `x-request-id` header

### `tests/task.list.filters.test.ts`

The filter combinatorics are the most likely place for a regression. I'm covering each filter alone, plus a few combinations.

- empty filters → all rows, default sort desc createdAt
- single status → only that status
- multi-status → union
- multi-priority → union
- `q` matches title (case-insensitive)
- `q` matches description (case-insensitive)
- `dueBefore` and `dueAfter` together → bounded range
- `tags` any-of returns matches
- `sort=-dueDate,createdAt` orders correctly with nulls last on dueDate
- `limit=5` returns 5 rows and `nextCursor`
- following the cursor returns the next 5
- `limit=200` clamped to 100
- `cursor` of a non-existent id → returns next-page-relative-to-zero (defensive)
- conflicting filters return empty: `status=DONE` + `q=zzznever`

### `tests/task.read.test.ts`

- get by valid id → 200, full body
- get by missing id → 404 with `NOT_FOUND`
- ETag header is present and stable across two reads
- second read with `If-None-Match` → 304

### `tests/task.update.test.ts`

- patch a single field → 200, only that field changed, `updatedAt` advanced
- patch with empty body `{}` → 400 with code-level message
- patch with extra unknown field → 400 (Zod strict)
- patch missing id → 404
- after update, list cache is invalidated (verified by mutating then re-listing within 30s and seeing the new state)

### `tests/task.delete.test.ts`

- delete existing → 204
- delete same id again → 404
- after delete, item cache is invalidated
- after delete, list response no longer includes the row

### `tests/cache.invalidation.test.ts`

This is the test that justifies running a real Redis. Sequence per test:

1. Seed N rows.
2. List → records cache hit on second call within TTL.
3. Mutate.
4. Re-list → must reflect the mutation despite being inside TTL.

Three cases: create, update, delete. Each verifies that the list cache and (for update/delete) the item cache were invalidated.

### `tests/unit/cache-key.test.ts`

- same filters in different key order produce the same cache key
- adding a no-op filter (e.g. `status=undefined`) doesn't change the key
- different limits produce different keys

### `tests/unit/cursor.test.ts`

- encode then decode round-trips
- decoding a malformed cursor throws a typed error

### `tests/smoke/health.test.ts`

- `/healthz` → 200
- `/readyz` → 200 when both backends up
- `/readyz` with Redis disconnected → 200 with `redis: degraded` (per §06)

### `tests/smoke/openapi.test.ts`

- `/openapi.json` returns valid JSON with `openapi: '3.1.0'`
- `/docs` returns HTML that contains `swagger-ui`
- every route under `/api/v1` is present in the spec

### `tests/smoke/error.test.ts`

- forced thrown error from a debug route → 500 envelope, requestId, no stack in body
- 404 envelope on unknown route
- payload over 1mb → 413

## What I'm not testing

Calling these out so the gaps are visible.

**The frontend.** No Playwright, no Cypress, no Vitest component tests. Manual smoke + `tsc --noEmit` + ESLint is what catches regressions. For an internship-shaped scope this is honest; for a real product I'd start with a half-dozen Playwright happy-path tests and grow from there.

**Prisma's behavior.** I'm testing my repository's `where` and `orderBy` shape produce the right rows from the DB. I'm not testing that `prisma.task.findMany({ where: { id: x } })` returns the row with id `x`. That would be testing Prisma.

**Performance.** No load tests. I have a paragraph in `12-retrospective.md` about what k6 scenarios I'd run with another day. Cache TTLs and indexes are designed conservatively, on the principle that it's easier to relax a constraint than to discover one was missing.

**Security as such.** No fuzz testing, no dependency vulnerability scan. The validation layer is exercised by the integration tests; rate limiting is configured but its tests are smoke-level (one over-the-line request → 429). A real product would add `npm audit --production` to CI and a SAST step.

## Coverage target

80% lines on the API package. I'm writing tests for behavior, then checking coverage. If a number is uncovered, the question is "should this be tested?", not "how do I add a line to bring the number up?".

The error handler is the easiest place to hit 100% and the easiest to make meaningless. I'm covering it through the smoke + integration tests rather than direct unit tests, because the thing I care about is the response envelope, not the function in isolation.

## Running tests

```bash
# from src/problem5/api/
docker compose -f ../docker-compose.test.yml up -d postgres-test redis-test
npm run test
npm run test:coverage
docker compose -f ../docker-compose.test.yml down
```

Or, the all-in-one script:

```bash
npm run test:integration
```

Which spins up the test stack, runs the suite, and tears down regardless of pass/fail.
