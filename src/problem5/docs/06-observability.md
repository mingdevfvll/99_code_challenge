# Observability

> What I'm logging, how request ids flow, and what I'd add for production.

## Logging

`pino` for everything in the API. JSON in production, pretty-printed in dev via `pino-pretty`. Default level `info`; flip to `debug` via `LOG_LEVEL=debug`.

Log call sites:

- **`pino-http` (auto)** — one entry log on inbound, one exit log on response with status, duration, response size.
- **Error handler** — one error log with stack, request id, route. Once per request, never twice.
- **Cache layer** — debug logs on hit/miss/set/invalidate. Off in prod.
- **Service layer** — only logs unusual decisions, e.g. "cache disabled, falling back to DB" when Redis is down.

Things I'm not logging:

- Request bodies. Could leak PII even in this domain. The schema is enough to reproduce most issues.
- Successful 2xx responses beyond what `pino-http` already emits.
- Per-query Prisma SQL. Available via `DEBUG=prisma:query` for ad-hoc debugging; off by default.

`console.log` is banned in shipped code. Lint rule: `no-console: ['error', { allow: ['warn', 'error'] }]`.

## Request id

A small middleware:

```ts
export const requestId = (req, res, next) => {
  req.id = req.headers['x-request-id'] ?? crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
};
```

It runs before `pino-http`. The pino instance is configured with `req.id` injected into every log line via `customProps`. Error envelopes always include `requestId`.

The web client (`api-client.ts`) generates a UUID per request and sends it as `x-request-id`. So a failed user action can be traced from the browser console to the API log to the error envelope, all sharing the same id.

## Health endpoints

Two endpoints, two different jobs.

| Endpoint | Question | Cost |
|---|---|---|
| `/healthz` | Is the process up? | Effectively free. Returns 200 always. |
| `/readyz` | Can it serve traffic right now? | One Postgres `SELECT 1`, one Redis `PING`. ~5ms. |

The Docker Compose healthcheck for the API uses `/readyz`. The Web container's healthcheck just hits its own `/`. If `/readyz` returns 503, the API container is marked unhealthy and `web` waits.

I deliberately don't gate `/readyz` on Redis being up. Cache is non-critical (degrades to no-cache); a Redis outage shouldn't cascade into the API being marked unhealthy and pulled from a load balancer. So `/readyz` returns:

- `200` if Postgres is reachable. Redis status reported as `degraded` or `ok`.
- `503` only if Postgres is unreachable.

## Metrics

Not built. The architecture is ready to take them; the time isn't.

What I'd add, in order of impact:

1. `prom-client` with default Node metrics (event loop lag, GC, heap).
2. HTTP request histogram (status, route, method, duration buckets).
3. Cache hit ratio counter (per namespace).
4. Postgres pool gauges via Prisma's `$on('query')`.
5. Mount on `/metrics` behind a basic-auth or internal-network gate.

Each is ~30 minutes of work. The reason I'm not doing them: a `/metrics` endpoint with no Prometheus scraping it is a half-feature, and a real Prometheus + Grafana setup pushes scope into infrastructure I'd have to also document. Logs cover the demo's needs.

## Tracing

Same answer as metrics. OpenTelemetry would slot in cleanly because the layers are already named (`controller`, `service`, `repository`); each could span trivially. I'm not adding it for the same reason: a tracing setup with no collector to ship to is theater.

If asked in interview: `@opentelemetry/sdk-node` + `@opentelemetry/auto-instrumentations-node` gets you 80% of useful traces without any code changes. Adding manual spans around `service` methods and DB calls covers the rest.

## What "scaling" looks like

If this had to handle, say, 100x the data and 50x the QPS, the changes I'd reach for, in order:

1. **Replace `q` ILIKE search** with a `tsvector` column + GIN index, or push search to Meilisearch / Postgres FTS. ILIKE on `text` columns is fine until it isn't, and the cliff is steep.
2. **Sharding the cache key**. Today `tasks:list:*` invalidates on every write. With multi-tenancy or per-user lists, key on tenant/user. Without that change, write-heavy workloads pay a cache-thrash tax.
3. **Switch invalidation from `SCAN+DEL` to a versioned namespace**. `tasks:list:v<n>:*`; bump `<n>` on writes; old keys age out via TTL. No SCAN cost.
4. **Move the API to `node:lts-alpine` with `NODE_ENV=production` and a worker pool** for CPU-bound paths. None today, but if I added export-to-CSV or PDF generation, this is where they go.
5. **Switch list pagination** to cursor-on-every-sort with base64-encoded composite cursors (covered in `03-data-model.md`).

None of this is in scope. Listing here because "knows what to do under load" is what observability documentation is for.

## Local debugging shortcuts

Things I keep needing:

```bash
# Tail API logs in pretty mode
docker compose logs -f api | npx pino-pretty

# Show all requests over 50ms
docker compose logs api | npx pino-pretty | grep -E 'duration":[0-9]{3,}'

# Connect to the DB
docker compose exec postgres psql -U postgres -d tasks

# Flush Redis (clears all caches)
docker compose exec redis redis-cli FLUSHDB

# Show all cache keys
docker compose exec redis redis-cli --scan --pattern 'tasks:*'
```

These are also in `08-runbook.md` under "common operations". I'm restating them here because that's where I look when I'm debugging, not in the runbook.
