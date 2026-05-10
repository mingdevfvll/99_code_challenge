# API Specification

> Reference. Curl examples are runnable against `docker compose up`. The runtime version of this lives at `http://localhost:4000/docs` (Swagger UI generated from the same Zod schemas).

## Conventions

- **Base path:** `/api/v1`
- **Content type:** `application/json` for both request and response.
- **Success envelope:** `{ "data": ... }`
- **Error envelope:** `{ "error": { "code": "...", "message": "...", "details"?: ..., "requestId": "..." } }`
- **Request id:** Every response includes `x-request-id`. Send your own via the same header to correlate; the API will honor it.
- **Timestamps:** ISO 8601 UTC, e.g. `2026-05-09T17:30:00.000Z`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/tasks` | Create a task |
| `GET` | `/api/v1/tasks` | List tasks with filters |
| `GET` | `/api/v1/tasks/:id` | Get one task |
| `PATCH` | `/api/v1/tasks/:id` | Update a task |
| `DELETE` | `/api/v1/tasks/:id` | Delete a task |
| `GET` | `/healthz` | Liveness |
| `GET` | `/readyz` | Readiness |
| `GET` | `/docs` | Swagger UI |
| `GET` | `/openapi.json` | OpenAPI 3.1 document |

---

## `POST /api/v1/tasks`

Create a task.

**Request body** (`createTaskSchema`):

```json
{
  "title": "Send invoice to Acme",
  "description": "Net 30, attach W-9.",
  "status": "TODO",
  "priority": "HIGH",
  "dueDate": "2026-06-01T00:00:00.000Z",
  "tags": ["billing", "client"]
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `title` | string | yes | 1–200 chars, trimmed |
| `description` | string \| null | no | optional |
| `status` | enum | no | one of `TODO`, `IN_PROGRESS`, `DONE`, `ARCHIVED`. Default `TODO`. |
| `priority` | enum | no | one of `LOW`, `MEDIUM`, `HIGH`, `URGENT`. Default `MEDIUM`. |
| `dueDate` | string \| null | no | ISO 8601 |
| `tags` | string[] | no | max 20 items, each 1–50 chars, lowercase, deduplicated |

**Responses**

`201 Created`:

```json
{
  "data": {
    "id": "clx7m9...",
    "title": "Send invoice to Acme",
    "description": "Net 30, attach W-9.",
    "status": "TODO",
    "priority": "HIGH",
    "dueDate": "2026-06-01T00:00:00.000Z",
    "tags": ["billing", "client"],
    "createdAt": "2026-05-09T17:30:00.000Z",
    "updatedAt": "2026-05-09T17:30:00.000Z"
  }
}
```

`400 Bad Request` — validation failure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body failed validation",
    "details": [
      { "path": "title", "message": "String must contain at least 1 character(s)" },
      { "path": "dueDate", "message": "Invalid datetime" }
    ],
    "requestId": "1f2c..."
  }
}
```

**Curl**:

```bash
curl -sS -X POST http://localhost:4000/api/v1/tasks \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Send invoice to Acme",
    "priority": "HIGH",
    "tags": ["billing","client"]
  }'
```

---

## `GET /api/v1/tasks`

List tasks. Supports filters, sort, and cursor pagination.

**Query parameters** (`listTaskQuerySchema`):

| Param | Type | Multi | Default | Notes |
|---|---|---|---|---|
| `status` | enum | yes | — | repeatable: `?status=TODO&status=IN_PROGRESS` |
| `priority` | enum | yes | — | repeatable |
| `q` | string | no | — | ILIKE on `title` and `description` |
| `dueBefore` | ISO 8601 | no | — | inclusive |
| `dueAfter` | ISO 8601 | no | — | inclusive |
| `tags` | string | no | — | comma-separated, any-of match |
| `sort` | string | no | `-createdAt` | comma list, leading `-` = desc. Allowed: `createdAt`, `dueDate`, `priority`, `title` |
| `limit` | int | no | `20` | 1–100 |
| `cursor` | string | no | — | opaque, from previous `nextCursor` |

**Response** `200 OK`:

```json
{
  "data": [
    { "id": "clx...", "title": "...", "...": "..." }
  ],
  "pagination": {
    "nextCursor": "clx7m9..." ,
    "hasMore": true
  }
}
```

When the page is the last one, `nextCursor` is `null` and `hasMore` is `false`.

**Curl**:

```bash
# All open, high+ priority, due this month, sorted by due date asc then created desc
curl -sS 'http://localhost:4000/api/v1/tasks?status=TODO&status=IN_PROGRESS&priority=HIGH&priority=URGENT&dueBefore=2026-06-01T00:00:00Z&sort=dueDate,-createdAt&limit=20'
```

**Caching**

- TTL: 30s.
- Key: `tasks:list:<sha256(canonical-json(parsedFilters))>`.
- Invalidated on any create/update/delete.
- Hit/miss is logged at debug level. The response itself doesn't expose cache state today; if I needed to debug from outside, I'd add an `x-cache: HIT|MISS` response header. Out of scope for the submission.

---

## `GET /api/v1/tasks/:id`

Get one task.

**Path parameter:** `id` — cuid string.

**Response** `200 OK`:

```json
{ "data": { "id": "clx...", "title": "...", "...": "..." } }
```

**Headers**: `ETag: "<sha256(JSON)>"`. Send `If-None-Match` to receive `304 Not Modified`.

`404 Not Found`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Task not found",
    "requestId": "..."
  }
}
```

**Curl**:

```bash
curl -sS http://localhost:4000/api/v1/tasks/clx7m9...
```

**Caching**: TTL 60s on `tasks:item:<id>`. ETag is recomputed on miss.

---

## `PATCH /api/v1/tasks/:id`

Partial update. Send only the fields you're changing.

**Request body** (`updateTaskSchema`): all fields optional, same constraints as create.

```json
{ "status": "DONE" }
```

**Response** `200 OK` — same shape as create.

**Errors**

- `400 VALIDATION_ERROR` — bad payload.
- `404 NOT_FOUND` — id doesn't exist.
- `400 VALIDATION_ERROR` with code-level message if the body is empty (`{}`).

**Curl**:

```bash
curl -sS -X PATCH http://localhost:4000/api/v1/tasks/clx7m9... \
  -H 'Content-Type: application/json' \
  -d '{"status":"DONE"}'
```

---

## `DELETE /api/v1/tasks/:id`

Hard delete.

**Response** `204 No Content` (no body).

`404 Not Found` if the id doesn't exist. The endpoint is **not** idempotent in the strict HTTP sense — a second delete of the same id returns 404. I'm choosing this over silent 204-on-missing because hiding the second delete masks bugs in the caller. Documented as a deliberate choice in `11-decisions.md`.

**Curl**:

```bash
curl -sS -X DELETE -i http://localhost:4000/api/v1/tasks/clx7m9...
```

---

## Operational endpoints

### `GET /healthz`

Liveness. Returns `200 { "status": "ok" }` whenever the process is up.

### `GET /readyz`

Readiness. Pings Postgres (`SELECT 1`) and Redis (`PING`). Returns `200 { "status": "ok", "checks": { "postgres": "ok", "redis": "ok" } }` on success, `503` otherwise with the failing checks.

### `GET /docs`

Swagger UI. Bundles the spec from `/openapi.json`.

### `GET /openapi.json`

OpenAPI 3.1 document, generated from the same Zod schemas the server validates against. If you only trust one source for the contract, trust this.

---

## Error code reference

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body or query failed Zod parse. `details` lists per-field issues. |
| 400 | `BAD_REQUEST` | Other malformed input (e.g. PATCH with empty body). |
| 404 | `NOT_FOUND` | Resource doesn't exist. Also returned when DELETE is retried. |
| 409 | `CONFLICT` | Reserved. No current endpoint emits this. |
| 413 | `PAYLOAD_TOO_LARGE` | Body over 1mb. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Non-JSON body on JSON endpoint. |
| 429 | `RATE_LIMITED` | Per-IP threshold hit. `Retry-After` header included. |
| 500 | `INTERNAL_ERROR` | Anything uncaught. `requestId` in body for log correlation. |
| 503 | `DEPENDENCY_UNAVAILABLE` | Postgres or Redis ping failed during a request. Surfaces from `/readyz` too. |

The 409 row is in the table because the error class exists in the codebase and the OpenAPI doc references it. No current endpoint can throw it. Listed here so a future me reading this doesn't think it was an oversight.

---

## Rate limits

| Scope | Limit | Window |
|---|---|---|
| Global per-IP | 100 requests | 1 minute |
| Per-IP, mutating routes (POST/PATCH/DELETE) | 30 requests | 1 minute |

Exceeded responses include `Retry-After` (seconds) and `X-RateLimit-*` headers.
