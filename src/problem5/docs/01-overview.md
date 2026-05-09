# Overview — Problem 5

> What this problem asks for, what I decided to build, and how I'll know I'm done.

## The brief

Build an ExpressJS server in TypeScript that does CRUD over a single resource, persists it, ships with a README, and runs locally. The bullet list from the brief:

1. Create a resource.
2. List resources with basic filters.
3. Get one resource by id.
4. Update a resource.
5. Delete a resource.

Persistence layer is "your choice", documentation is "expected", and the time guideline is 16 hours for an internship-level submission.

## How I'm reading it

Two ways to clear a brief like this. The first is to do exactly what's asked, hand it in, and let the work speak for itself. The second is to do exactly what's asked plus a small amount more in places that demonstrate craft. I'm picking the second, with rules:

- Anything I add must be visible to a reviewer in the first 3 minutes after `docker compose up`.
- Anything I add must not push the total scope past my own 16h budget by more than 1h.
- Nothing I add should make the core CRUD harder to read.

The "small amount more" is:

- A real layered architecture instead of route-handler-to-Prisma.
- A Next.js admin UI on the same domain, since the brief is tagged Backend and Fullstack.
- OpenAPI generated from the Zod schemas the request validator already uses.
- Redis-backed cache and rate limiter, because they ship as one extra container and explain themselves.

Everything else is on the cut list in `00-implementation-plan.md` §15.

## Domain choice

Task manager. Five fields plus a tag array:

- `title`, `description`, `status`, `priority`, `dueDate`, `tags[]`

Why not Product, Note, or User? Product needs money and inventory semantics that bleed into validation, formatting, and edge cases I'd have to decide and defend. Note has too few axes to make filtering interesting; the list endpoint would essentially be `findMany()`. User would push me into auth-adjacent territory, which I'm explicitly not doing here.

Task is the cleanest middle. Every field maps to a real UI control, the filter combinations are non-trivial, and I won't get stuck on a domain decision while writing code.

## Out of scope

Listed in `00-implementation-plan.md` §15. The short version, so this file stands alone:

- No auth or multi-tenancy.
- No realtime updates, file uploads, or notifications.
- No frontend e2e tests, no CI workflow, no metrics.
- No production deploy.

Each of those has a single-paragraph "what I'd add and why I didn't" in `12-retrospective.md`.

## Success criteria

A reviewer who clones the repo, copies `.env.example`, and runs `docker compose up --build` should reach the running web app inside 5 minutes. Inside it they should be able to create, edit, status-change, and delete a task. Hitting `/docs` on the API port should render an OpenAPI spec that matches what's actually exposed.

If they prefer reading to running, `00-implementation-plan.md` plus `02-architecture.md` plus `04-api-spec.md` should give them the full picture without ever starting a container.

## Repo fit

This sits next to:

- `problem1/` — three implementations of `sum_to_n` with a benchmark CLI.
- `problem2/fancy-ex/` — Next.js currency swap with shadcn, RHF, Zod, TanStack Query.
- `problem3/wallet-app/` — Next.js wallet table with the same stack vocabulary.
- `problem4/` — three solutions of `sum_to_n` (older folder).

The conventions I'm carrying across:

- Per-folder `README.md` and `docs/` folder.
- Same Zod-first validation pattern as `fancy-ex`.
- Same kebab-case file naming and `'use client'` discipline as `wallet-app`.
- Same ADR-style `decisions` log so readers can trace "why" without grep-fishing.

The convention I'm breaking, and explaining in `11-decisions.md`:

- This problem has a backend folder. The other Next.js problems are frontend-only. So `src/problem5/api/` and `src/problem5/web/` sit as siblings, not as `web/` containing the server.
