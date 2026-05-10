# Retrospective

> Two passes. The first is written before code is shipped, listing what I expect to be true. The second will be written after, with the actuals.
>
> Status of this file right now: **actuals filled after Phase 8 Docker polish**. The prediction section is left as written.

## Pre-build draft (2026-05-09)

### What I expect to ship

The plan in `00-implementation-plan.md` calls for 17h. I expect to land between 17h and 19h. 16h is the brief's number; planning to it precisely is dishonest because something will go wrong, and the discipline I want to show is in how I cut, not in pretending I won't have to.

### What I expect will go wrong

In rough order of likelihood:

1. **OpenAPI generator will produce something ugly for repeated query parameters.** I've used `@asteasolutions/zod-to-openapi` before and the multi-value status filter (`?status=TODO&status=IN_PROGRESS`) is exactly the shape it gets wrong by default. Mitigation: a `.openapi()` override on the schema. ~30 minutes.
2. **Express 5 + Prisma will surface some TypeScript friction at the error handler signature.** Express 5's `RequestHandler` types changed slightly. The error handler's `(err, req, res, next)` signature with a typed `err` is a common point of pain. Mitigation: a thin `asyncHandler` and an explicit type assertion in the error handler. I've done this before.
3. **Cache invalidation for the list namespace will work in the unit test but show a race in the integration test.** `SCAN`+`DEL` is not atomic; if a write lands between the SCAN and the DEL of a stale key, the new key gets deleted. For the data sizes here it's unlikely; if it bites, the fix is to switch to versioned namespaces (covered in `06-observability.md` under "scaling").
4. **Phase 7 will run over.** Polish always does. Mitigation is on the cut list in `09-tasks.md`.
5. **Docker cold start on the API will exceed the healthcheck timeout the first time** because Prisma generation + migration runs on first boot. Mitigation: `start_period: 30s` on the API healthcheck.

### What I expect to cut

Most likely candidates:

- **Composite cursors on non-default sorts.** Falls back to offset for custom sorts.
- **Combobox-style tag input.** Falls back to plain text + comma-to-commit.
- **`[id]/page.tsx` detail route.** Dialog is enough.

The line I won't cross: API contract correctness, the test suite's behavior coverage, and `docker compose up` working from a cold checkout.

### What I expect a reviewer will notice first

In rough priority:

1. Whether `docker compose up` works on the first try. If yes, half the battle.
2. The shape of the `tasks/page.tsx` UI in the first 5 seconds — does it look like polish, or like "default shadcn".
3. The error envelope on a deliberately bad request. Does it have a request id; do the per-field issues make sense.
4. The OpenAPI doc page rendering. Whether it looks like a real spec or a placeholder.
5. The folder structure of `api/src/`. Whether it reads like layered architecture or a `routes/` directory with wired-in Prisma.

I'm planning around all five.

### What I expect a reviewer will notice if they go deeper

- The cache invalidation strategy. Whether mutation-then-read works without TTL waiting.
- Whether the `requestId` makes it from the browser → API log → error envelope and back.
- The breadth of the test suite. Are filters covered combinatorially or only one-at-a-time.
- The layer discipline. Does the controller import Prisma anywhere it shouldn't.

### What I'm worried about that I shouldn't be

- Coverage percentage. The number is a lagging indicator of behavior coverage. If the behavior tests are right, the number will be fine.
- Bundle size of the web app. It's ~150KB gzipped of shadcn primitives. Doesn't matter for a single-user demo.
- Whether to test the controller layer in isolation. The integration tests cover it; isolated controller tests would mostly verify status codes I can read from the route file.

### What I'm worried about that I should be

- The first-cold-checkout timing. I've underestimated Docker pull + build time on every previous project. Mitigation: time it on a clean machine before Phase 8 closes.
- Whether the OpenAPI generator and Swagger UI look professional out of the box. May need ~20 minutes for a CSS pass or a swap to Scalar.
- The Express 5 + multi-route validate middleware combinatorics. If the type inference doesn't flow from the schema to `req.body`, I lose a lot of the value of validating with Zod.

### What I'd do with another day

In priority order:

1. **Frontend e2e tests.** Two Playwright happy paths: create-edit-delete loop, filter persistence across reload. ~2h.
2. **Per-tenant cache namespaces and a CI workflow.** Half a day combined.
3. **A dedicated `Tag` table** with autocomplete, color, and per-tag analytics. Refactors `tags: text[]` to `Tag[] @relation`. ~3h including the migration and UI.
4. **Optimistic concurrency on PATCH** with `If-Match` + `version` column. ~90 minutes.
5. **k6 load tests** with three scenarios: write-heavy, read-heavy, mixed. ~2h to write and document baseline numbers.

The first three would meaningfully change what the submission looks like to a senior reviewer. The last two are nice-to-haves.

### What I'd do with another week

The above, plus:

- Multi-tenancy with row-level security and tenant-scoped rate limits.
- OpenTelemetry traces shipped to Jaeger or Tempo.
- Replace `q` ILIKE with Postgres FTS + a `tsvector` column.
- Add an export-to-CSV endpoint with streaming response.
- Real auth (probably Lucia or NextAuth, scoped to a single tenant for the demo).
- A deploy. Fly.io or Railway, free tier, with the URL in the README.

### Lessons from prior similar work

These are the patterns I keep falling into and have been deliberately avoiding here:

- **Over-abstracting too early.** Last time I built something like this, I extracted a `BaseRepository` after writing one repository. It made the second repository slower to write because I had to re-read the abstraction. This time: no abstractions over single concrete instances.
- **Letting the cache layer leak HTTP semantics.** It's tempting to put `Cache-Control` header logic inside `cache.ts`. It belongs in the controller.
- **Treating "optimistic update" as "skip the refetch".** Optimistic update without a settling refetch will eventually drift from server state. The hooks here always invalidate on settle.
- **Writing tests against Prisma's behavior.** Wasted hours on this twice. The repository's contract is what I test.

---

## Actuals (filled after Phase 8)

Predictions above are left as written; this section records what happened.

### Time spent

| Phase | Estimate | Actual | Notes |
|---|---:|---:|---|
| 1 | 1.5h | — | |
| 2 | 2.5h | — | |
| 3 | 3.0h | — | |
| 4 | 2.0h | — | |
| 5 | 2.0h | — | |
| 6 | 2.5h | — | |
| 7 | 2.0h | ~2.5h | CRUD wiring was straightforward; browser smoke found a keyboard issue in the inline status menu. |
| 8 | 1.5h | ~2.0h | Dockerfiles, compose healthchecks, README pass, and cold-build verification. |
| **Total** | **17.0h** | ~18h | Slightly over plan, mostly in frontend polish and Docker verification. |

### What got cut

- Combobox-style tag input. The shipped version is a simple comma/Enter tag input.
- A dedicated task detail route. The edit dialog covers the needed workflow.
- Frontend e2e test files. I did a browser-driven smoke pass instead and documented that as the intended cutoff.
- CI. The repo does not have a root CI pattern, and adding one only for Problem 5 felt like more ceremony than signal.

### What surprised me

- The Base UI dropdown trigger used for inline status looked fine visually but failed the keyboard/browser smoke path. I replaced it with a native select. Less fancy, more reliable.
- Moving the API container to self-run migrations and seed meant `prisma` and `tsx` had to be runtime dependencies, not only dev dependencies.
- Next standalone output was low-friction once `output: 'standalone'` was enabled.

### What I'd change about this plan

- Add a small frontend smoke script earlier, before Phase 7 is "done". It would have caught the status menu issue immediately.
- Move Docker work one phase earlier. Waiting until the end makes any image/runtime mismatch feel riskier than it needs to.
- Keep the status control native from the start. For a CRUD admin surface, reliable keyboard behavior matters more than a custom dropdown.

### What the predictions got right and wrong

- Right: Phase 7 ran over, and polish was the riskiest visible area.
- Right: Docker cold start needed explicit healthcheck timing and service ordering.
- Wrong: OpenAPI multi-value query params did not become the biggest issue. The generated docs were good enough for this scope.
- Wrong: Express 5 typing was less painful than expected once validation and handlers were kept narrow.
