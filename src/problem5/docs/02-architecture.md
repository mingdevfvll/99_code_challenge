# Architecture

> Layers, request flow, and the boundaries between them. The "why this shape" lives in `11-decisions.md`; this file explains how the shape works.

## Layer map

```
┌─────────────────────────────────────────────────────────────────┐
│                          web (Next.js)                          │
│                                                                 │
│   app/tasks/page.tsx                                            │
│         │                                                       │
│         ▼                                                       │
│   hooks/use-*-query.ts ──► lib/api-client.ts ──► fetch(API)     │
│                                  │                              │
│                                  ▼                              │
│                              Zod parse                          │
└──────────────────────────────────┬──────────────────────────────┘
                                   │  HTTP
┌──────────────────────────────────▼──────────────────────────────┐
│                           api (Express)                         │
│                                                                 │
│   routes ──► validate(Zod) ──► controller ──► service ──► repo  │
│                                                  │         │    │
│                                              cache(Redis) Prisma│
│                                                            │    │
│                                                            ▼    │
│                                                       PostgreSQL│
└─────────────────────────────────────────────────────────────────┘
```

Four named layers on the API side. Each one has one job, and the rules for what it touches are strict.

| Layer | Owns | Touches | Doesn't touch |
|---|---|---|---|
| `routes` | URL → handler binding, middleware order | `controller`, `validate(schema)` | Prisma, Redis, business rules |
| `controller` | HTTP shape (status codes, headers, response envelope) | `service` | Prisma, Redis, Zod |
| `service` | Business rules, cache strategy, invalidation | `repository`, `cache` | Prisma directly, HTTP types |
| `repository` | Database queries | `prisma` | HTTP, cache, business rules |

The repository is the only file that imports `prisma`. The controller is the only one that imports HTTP error types. Every cross-boundary call goes through a function, not a shared object. That's how I keep this small enough to refactor without thinking.

## Middleware order

Order matters and is easy to get wrong. I'm pinning it here:

```
helmet                  ← security headers first, before anything else can write a response
cors                    ← CORS preflight resolved before the body is touched
compression             ← gzip/deflate negotiation
request-id              ← attaches req.id, sets x-request-id response header
pino-http               ← logs entry/exit with req.id
rate-limit              ← Redis-backed, drops noisy clients before reaching routes
express.json (limit 1mb)← body parser
router                  ← /api/v1/tasks, /healthz, /readyz, /docs, /openapi.json
not-found               ← 404 envelope for unmatched routes
error-handler           ← last. Catches sync + async errors. Formats RFC-7807-shaped envelope.
```

Two specific things:

The **request-id middleware comes before pino-http** so every log line for a request includes the id. Reverse this and the entry log line is unidentified.

The **rate-limit middleware comes before express.json** so a flood of large bodies can't spend memory parsing requests we're about to reject. Cheap rejections first.

## Request lifecycle: write

`POST /api/v1/tasks` with a JSON body.

1. Middleware chain runs through `pino-http`. Inbound log line written with method, path, request id.
2. Rate limiter checks Redis. If over threshold, responds 429 with `Retry-After`. Done.
3. Body parser builds `req.body`. If oversize, 413.
4. Router dispatches to `task.routes.ts`, which has `validate(createTaskSchema)` first.
5. The validate middleware runs `createTaskSchema.safeParse(req.body)`. On failure, throws `ValidationError` carrying the Zod issues. The error handler turns this into a 400 envelope.
6. On success, `req.body` is replaced with the parsed value (now strongly typed downstream).
7. `task.controller.ts` calls `taskService.create(req.body)`.
8. `task.service.ts` calls `taskRepository.create(input)`, awaits the result, then fires off `cache.invalidatePrefix('tasks:list:')`. Cache invalidation is awaited so a subsequent read in the same request sees the write.
9. `task.repository.ts` runs `prisma.task.create({ data })` and returns the row.
10. Controller wraps the row as `{ data: task }` and responds 201.
11. `pino-http` logs the exit line with status, duration, request id.

If anything throws between steps 4–10, the error handler runs. It maps known error classes (`ValidationError`, `NotFoundError`, `RateLimitError`, etc.) to status codes and envelopes, and falls through to `INTERNAL_ERROR` for anything unrecognized. The request id always travels with the response.

## Request lifecycle: read

`GET /api/v1/tasks?status=TODO&limit=20` is the more interesting path because of caching.

1. Same middleware chain through validate. The list query schema is a separate Zod schema (`listTaskQuerySchema`) that coerces strings to numbers/dates/enums.
2. Controller calls `taskService.list(filters)`.
3. Service builds a deterministic cache key from a stable hash of the parsed filters: `tasks:list:<sha256(json)>`.
4. Service calls `cache.getOrSet(key, ttl=30s, () => taskRepository.findMany(filters))`.
5. On hit: deserialize and return.
6. On miss: run the repository call, write to Redis with TTL, return.
7. Controller wraps the array as `{ data: tasks, pagination: { nextCursor } }` and responds 200.

Single-item read (`GET /api/v1/tasks/:id`) follows the same pattern with key `tasks:item:<id>` and TTL 60s.

## Cache invalidation

Two cache namespaces:

- `tasks:list:*` — list query results.
- `tasks:item:<id>` — single item.

Mutation rules:

| Mutation | Invalidates |
|---|---|
| Create | `tasks:list:*` |
| Update by id | `tasks:list:*` and `tasks:item:<id>` |
| Delete by id | `tasks:list:*` and `tasks:item:<id>` |

`invalidatePrefix` does a `SCAN` + `DEL`. Fine at this data size; I'd switch to a per-tenant or per-status keyspace if the list keyspace blew up. Noted in `06-observability.md`.

## Layer boundaries in code

The boundaries above are enforced by where I import things, not by a build-time check. To make this maintainable I'm:

- Keeping each module's files alphabetically next to each other (`task.controller.ts`, `task.repository.ts`, etc.) so the boundary is visible by file name.
- Routing all errors through the `core/errors/http-errors.ts` types so any layer can throw a domain error without knowing the HTTP layer.
- Writing one paragraph of header comment in each file naming what it's allowed to import.

If this scaled past ~5 modules I'd reach for a real boundary check (eslint-plugin-boundaries or a custom rule). Two modules and a 16h budget doesn't justify it.

## Web ↔ API contract

The web side keeps its own copy of the Zod schemas in `web/schemas/task.ts`. They mirror the API ones. I considered sharing them via a workspace package; see `11-decisions.md` for why I'm not.

The contract that matters for the UI:

- All success responses are `{ data: ... }`.
- All error responses are `{ error: { code, message, details?, requestId } }`.
- Status codes carry the meaning, the body explains it.

`api-client.ts` parses both shapes and throws a typed `ApiError` on the error envelope. Hooks rely on TanStack Query for retry/backoff (`retry: 1, retryDelay: 500ms`) on 5xx; 4xx errors don't retry.

## Failure modes worth naming

Things that will go wrong eventually and how the code is supposed to react.

- **Postgres down.** Prisma throws on the next query. Service layer doesn't catch; the error handler maps Prisma's `PrismaClientKnownRequestError` to a 503 envelope. `/readyz` flips to 503.
- **Redis down.** The cache wrapper catches and returns the underlying call. Reads degrade to "no cache". Writes don't fail. This is in `core/lib/cache.ts` as a try/catch around `getOrSet`. `/readyz` flips to 503 so an orchestrator can act, but the API keeps serving traffic. Logged at `warn`.
- **Validation failure.** Always 400, always with the per-field issue list, always with the request id.
- **Unhandled exception in user code.** Caught by the error handler, logged at `error` with full stack and request id, body returned as a generic 500 envelope without the stack.

The deliberate choice in there is the Redis-down behavior. A cache layer that crashes the API on backend outage is worse than no cache at all.
