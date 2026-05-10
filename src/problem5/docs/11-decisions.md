# Decisions

> ADR-style record of every non-obvious choice. One ADR per section. Each is short on purpose; the longer reasoning lives in whichever doc the decision applies to.

The format is loose: context, choice, alternative, why-not. I'm not numbering for an ADR registry — these are entries, not artifacts.

---

## Prisma 5.22, not 7.x

**Context.** Prisma 7.8 was the latest stable when I started Phase 1. I scaffolded with 5.22 anyway.

**Choice.** Pin to Prisma 5.22.

**Alternative considered.** Bump to 7.8.

**Why this and not that.** Skipping a major version (5 → 7) means absorbing two waves of breaking changes mid-build. The headline change in 7 — the new `prisma-client` ESM generator and the Rust-free query engine — buys me roughly 200ms of cold start and ~30MB off `node_modules`, neither of which is the bottleneck for a single-table CRUD demo. The cost is non-trivial: the schema's `provider` line changes, the import paths for the generated client move, and `@asteasolutions/zod-to-openapi` compatibility with Prisma 7 is recent enough that I'd be debugging integration points instead of building features.

For a 16h budget I'd rather spend the hour elsewhere. 5.22 is still maintained, not deprecated.

If this codebase needed a longer maintenance horizon, I'd bump. The migration is mechanical, just not free.

---

## Prisma over Drizzle

**Context.** I need a typed database layer for one table with a non-trivial query (filters + cursor pagination). Both Prisma and Drizzle are valid choices in 2026.

**Choice.** Prisma 5 + PostgreSQL 16.

**Alternative considered.** Drizzle ORM. Lighter runtime, more SQL-native, no codegen step at request time.

**Why this and not that.** For a 16h scope, the balance favors Prisma's tooling: declarative migrations, schema-first thinking, a generated client whose types are nearly free. Drizzle's wins (smaller cold start, no client generation step, closer-to-SQL builder) matter more in steady-state ops than in a one-author build. The cost of a 30s extra cold start in Docker is one I'm willing to pay for the migration ergonomics.

If this were a long-running service I expected to maintain for years, I'd weigh Drizzle higher.

---

## Schema duplication between API and web

**Context.** Both `api/` and `web/` need the Task Zod schemas. There are three ways to avoid duplication: pnpm workspace with a `shared` package, monorepo tools (Turborepo, Nx), or a published npm package.

**Choice.** Duplicate the schemas. `api/src/modules/task/task.schema.ts` and `web/schemas/task.ts` define them independently.

**Alternative considered.** pnpm workspace with `packages/shared/schemas/task.ts`.

**Why this and not that.** The setup cost of a workspace (root `package.json`, `pnpm-workspace.yaml`, build orchestration, two `tsconfig.json` extensions, plus the cognitive overhead of understanding which workspace owns what) is not worth it for two consumers. The risk of drift is real but bounded — the API's contract is also published as `/openapi.json`, so the web schemas have an external check.

If a third consumer appeared (mobile app, CLI), I'd reach for the workspace.

---

## Native Postgres enums for status and priority

**Context.** Two enum-like columns on Task. Three storage shapes possible: native enum, string + CHECK constraint, lookup table.

**Choice.** Native Postgres enums.

**Alternative considered.** String column with a CHECK constraint.

**Why this and not that.** The values are stable for the lifetime of the demo. Adding a value via `ALTER TYPE ADD VALUE` is fine; removing or renaming is painful. If the values were end-user-defined or churning, I'd switch to string + lookup table. They're not.

The bigger reason: native enums cooperate with Prisma's type generation more cleanly, so the TS layer stays honest about valid values.

---

## cuid over UUID v4

**Context.** Primary key strategy.

**Choice.** `String @id @default(cuid())`.

**Alternative considered.** `String @id @default(uuid())` (v4) and `Int @id @default(autoincrement())`.

**Why this and not that.** cuid sorts roughly by creation time, which means default `ORDER BY id DESC` is approximately the same as `ORDER BY createdAt DESC`. Shorter than UUID v4 in URLs. The cost is portability — cuid is library-flavored. For an interview submission this trade is fine.

I rejected `autoincrement()` because predictable sequential ids leak how busy the API is and invite enumeration. A reviewer who counts `1..N` learns more about my user base than I want them to.

---

## `routes → controller → service → repository` shape

**Context.** Layer boundaries for the API code.

**Choice.** Four named layers, each in its own file per module.

**Alternative considered.** Two layers (route handler + repository), or three (route + service + repository, no separate controller).

**Why this and not that.** The four-layer split makes the cache-invalidation contract live in the service layer, untouched by HTTP concerns. It also makes each file small enough that a reader can hold it in their head. The cost is two files I could otherwise collapse, which is a price I'll pay for the clarity.

For a five-line CRUD with no caching, two layers would be enough. This isn't that.

---

## Redis-backed rate limit

**Context.** Need rate limiting. Two storage choices: in-memory (per process) and Redis.

**Choice.** Redis (`rate-limit-redis` + `express-rate-limit`).

**Alternative considered.** In-memory (`express-rate-limit` default).

**Why this and not that.** In-memory rate limits assume one process, which is fine for the demo but communicates the wrong thing about the architecture. Since Redis is already in the stack for the cache, the marginal cost of using it for the rate limiter is one library import. The decision is consistent with how I'd build it for production.

---

## `/readyz` does not 503 when Redis is down

**Context.** What does "ready" mean when a non-critical dependency is unavailable.

**Choice.** Postgres unavailable → 503. Redis unavailable → 200 with `redis: degraded`.

**Alternative considered.** Treat Redis as a hard dependency, return 503 on outage.

**Why this and not that.** Redis is a cache and a rate-limit store. Both degrade gracefully (no cache → DB hit; no rate limit → process keeps serving). Cascading a Redis outage into "API is not ready, pull it from the load balancer" turns a soft failure into a hard one.

I'd want to verify this once with a real load balancer in production, but the design is intentional.

---

## Hard delete, no soft delete

**Context.** DELETE behavior. Could mark `deletedAt` and filter on read; could remove the row.

**Choice.** Hard delete. The row is gone from Postgres after `DELETE`.

**Alternative considered.** Soft delete via `deletedAt: DateTime?`.

**Why this and not that.** Soft delete buys you recovery and audit. Neither is in the brief. Adding `deletedAt` introduces a filter every read query has to remember (and one I will eventually forget on a future endpoint), and `status = ARCHIVED` already plays the "this is dead but visible to admins" role. Two concepts for the same purpose is the kind of thing that bites a year later.

Production with audit requirements: I'd add soft delete and a separate `deleted_tasks` event log.

---

## DELETE is not idempotent at the HTTP layer

**Context.** RFC 7231 says DELETE should be idempotent: `DELETE /x` then `DELETE /x` should produce the same observable result. Many APIs achieve this by responding 204 to the second call regardless of whether the resource exists.

**Choice.** First DELETE → 204. Second DELETE → 404.

**Alternative considered.** Always 204 on DELETE.

**Why this and not that.** Silent 204 on missing-resource hides client bugs. If a client deletes the wrong id and gets 204, they have no signal something went wrong. The 404 is a lie about the resource state ("it doesn't exist", though technically it does, just not anymore), but it's a useful lie that says "you might want to check what you're sending".

If I were building a client that retried network errors, I'd want the API to be tolerant of "the first DELETE actually succeeded but the response got lost". That's an idempotency-key argument, not a "always 204" one.

---

## OpenAPI generated from Zod, not hand-written

**Context.** Need API documentation. Two strategies: write OpenAPI YAML by hand, or generate it from the Zod schemas the validator already uses.

**Choice.** Generate via `@asteasolutions/zod-to-openapi`.

**Alternative considered.** Hand-written OpenAPI YAML.

**Why this and not that.** A hand-written spec drifts from the implementation immediately. The first time I add a field to the Task schema and forget to update the YAML, the spec is a lie. Generating from Zod means the spec is always whatever the validator accepts.

The cost is a little hand-tuning where the generator produces awkward output (especially around repeated query parameters). Worth it.

---

## Cursor pagination only on default sort (initial)

**Context.** List endpoint supports custom sorts. Cursor pagination requires the cursor encode the value of every sort key for the last row.

**Choice.** Cursor pagination on the default sort `(createdAt desc, id desc)`. Custom sorts use offset/limit.

**Alternative considered.** Composite cursors (base64-encoded JSON) on every sort.

**Why this and not that.** Composite cursors are ~45 minutes more work and most users will never sort. If I have time in Phase 4, I'll upgrade. If not, it's documented as a limitation in `12-retrospective.md`.

This is one of two places where I'm explicitly time-boxing a feature. The other is the tag input.

---

## Backend in `api/`, frontend in `web/` as siblings

**Context.** The repo's other Next.js problems (`fancy-ex`, `wallet-app`) are flat — the Next.js app is the project. This problem has a backend and a frontend.

**Choice.** `src/problem5/api/` and `src/problem5/web/` as sibling folders.

**Alternative considered.** `src/problem5/` is the Next.js app, with API code under `app/api/` (Next.js route handlers).

**Why this and not that.** Next.js route handlers can do CRUD, but the brief asks for ExpressJS specifically. Building an Express server inside Next.js's app dir would be a fight against Next's tooling. Two siblings makes both packages obvious in `tree`, lets each have its own `Dockerfile` and `package.json`, and matches how a production team would split frontend and backend.

---

## No CI workflow in this problem

**Context.** Could add `.github/workflows/ci.yml` for typecheck + test + lint.

**Choice.** Don't.

**Alternative considered.** Add it, ~30 minutes.

**Why this and not that.** None of the other problems have CI. Adding one only for Problem 5 introduces a pattern that's inconsistent with the repo. The right move is a repo-level CI (covering all four problems) which is out of scope for a problem-level submission.

If asked: I'd add a single workflow at `.github/workflows/ci.yml` that detects which problem changed (`paths` filter) and runs the appropriate steps. Maybe 90 minutes for the whole repo.

---

## Vitest over Jest

**Context.** Test runner.

**Choice.** Vitest.

**Alternative considered.** Jest.

**Why this and not that.** Faster cold start, no Babel/SWC config required for ESM + TS, watch mode UX I prefer. Both are well-supported with supertest. This decision was easy and almost not worth recording, except that recording it is cheaper than re-deciding it the next time.

---

## tsx for dev, tsc + node for production

**Context.** Running TS in dev (`npm run dev`) and shipping it (`npm run build && node dist/index.js`).

**Choice.** `tsx watch src/index.ts` in dev. `tsc -p tsconfig.build.json` in build, then `node dist/index.js` at runtime.

**Alternative considered.** `ts-node` in dev. `tsx` for both dev and prod.

**Why this and not that.** ts-node's config gymnastics around ESM + paths is something I've burned hours on before. tsx skips that. Running tsx in production is fine for development services but I want the Docker image to ship plain `.js`, both for performance and because `node dist/index.js` is what a production runner would do.

---

## No auth, no users

**Context.** Brief doesn't ask. Adding it would push surface area materially.

**Choice.** Don't.

**Alternative considered.** Bearer-token middleware with a hard-coded test token for the demo.

**Why this and not that.** Even fake auth costs: a `userId` column on Task, "current user" plumbing through the layers, a token-validation middleware, additional test cases. None of it shows craft I can't show elsewhere. Documented in `00-implementation-plan.md` §15 and one paragraph in `12-retrospective.md`.

---

## Resolved time-boxed choices

These started as open questions during planning. The final build keeps the
choices explicit so the trade-offs are easy to review.

- **Tag input flavor** — shipped the simple comma/Enter tag input. It is fast
  to verify and easy to use from the keyboard.
- **Composite cursors for non-default sorts** — default sort uses cursor
  pagination; custom sorts use offset pagination. Documented in the API spec
  and covered by tests.
- **Swagger UI vs Scalar** — kept Swagger UI because it stays close to the
  generated OpenAPI document and avoids another UI dependency.
- **Debug error routes** — kept them gated behind `NODE_ENV !== 'production'`.
  Production does not expose synthetic failure endpoints.
