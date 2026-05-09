# Security Posture

> What's in place, what's deliberately not, and what production would add. The threat model is "internal demo with public-ish endpoints"; treat this file as the floor, not the ceiling.

## What's in place

### Headers (helmet)

`helmet()` with defaults, applied first in the middleware chain. The headers it sets that matter most for this app:

| Header | Default value | Why |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'` (and friends) | Reasonable starting point. Tightened on the docs route — see below. |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` | HTTPS-only when behind TLS. |
| `X-Content-Type-Options` | `nosniff` | |
| `Referrer-Policy` | `no-referrer` | |
| `X-Frame-Options` | `SAMEORIGIN` | |
| `Cross-Origin-Resource-Policy` | `same-origin` | |

Swagger UI loads inline scripts and styles from a CDN, which the default CSP blocks. So `/docs` gets a route-scoped helmet config that loosens `script-src` and `style-src` to what Swagger UI needs, no more. Documented in code with a one-line comment.

### CORS

`cors({ origin: WEB_ORIGIN.split(','), credentials: false })`. No `*`. The allowlist is driven by the `WEB_ORIGIN` env var; comma-separated for multiple origins.

`credentials: false` because the API doesn't read or set cookies and there's no auth.

### Rate limiting

Two limiters via `express-rate-limit` + `rate-limit-redis`:

| Scope | Limit | Window |
|---|---|---|
| Global per-IP | 100 req | 1 min |
| Per-IP, mutating routes (POST/PATCH/DELETE) | 30 req | 1 min |

The mutation limiter sits between the validate middleware and the controller, so even a flood of valid mutations gets rejected. The global limiter sits before body parsing.

429 responses include `Retry-After` and `X-RateLimit-*` headers.

The rate limiter keys on `req.ip`. If the API ever sat behind a real proxy, `app.set('trust proxy', n)` would need to be set to the right number of hops. Documented as a TODO inline.

### Input validation

Every endpoint that accepts input runs the body or query through a Zod schema. The validate middleware is the only thing that touches `req.body` before the controller; the schema's `.strict()` mode rejects unknown fields. The TS types downstream of validation are inferred from the schema, so a controller that tries to read a field that wasn't validated won't compile.

What this gets us:

- No raw `req.body` access in services or controllers.
- Type errors on extra fields, not silent passthrough.
- Per-field error details in the 400 envelope.

What it doesn't get us:

- Protection against SSRF, since this app doesn't make outbound HTTP calls.
- Protection against SQL injection beyond what Prisma's parameterized queries already provide. We never use `$executeRaw` with user input.

### Output discipline

Controllers explicitly shape the response body. There's no `res.json(rowFromPrisma)` anywhere — every response goes through a `toTaskResponse(task)` mapper. Today that mapper is a passthrough; the discipline is in place so a future column added to the schema doesn't accidentally leak.

### Body size limit

`express.json({ limit: '1mb' })`. Bodies over the limit get a 413 envelope. The number is arbitrary but defensible — the largest legitimate Task body (long description + max tags) is well under 100KB.

### Secrets handling

There are no secrets in this app today. If there were:

- `.env` is gitignored. `.env.example` documents every variable but never holds a real value.
- `core/config/env.ts` parses env at boot via Zod. A missing required var crashes the process before listening, with a clear error message. Better to fail loud at boot than to fail strange at first request.
- No secrets in logs. The pino config has a `redact` list ready for fields like `password`, `token`, `authorization` in case they ever appear; right now there's nothing to redact.

### Dependency hygiene

`npm audit --production` is something I'd run pre-merge in a real workflow. For this submission, I've checked once at scaffold time. Documented as a step in `12-retrospective.md` under "what I'd add for CI".

## What's deliberately not in place

### No authentication

Documented in `00-implementation-plan.md` §15 and `11-decisions.md`. Briefly:

- Brief doesn't ask.
- Adding even fake JWT validation pushes API surface, doubles the test cases on every endpoint, and shows nothing the rest of the code doesn't already show.
- Adding real JWT validation pushes scope materially.

If asked: a `auth(req, res, next)` middleware reading `Authorization: Bearer <token>`, validating against a JWKS or a static secret, attaching `req.userId`, and then a `userId` column on Task with a Prisma `where: { userId: req.userId }` filter on every read. About 30 minutes for a fake version, 2 hours for a real one with refresh tokens.

### No CSRF protection

The web app talks to the API via JSON over fetch with no cookies. CSRF is a cookie-based attack; without cookies there's nothing to protect. If auth were added with cookies (rather than bearer tokens in localStorage), `helmet`'s `SameSite=Lax` cookie default plus a synchronizer token pattern would be the right starting point.

### No SAST / dependency scanning in CI

Same reason there's no CI in general — see `11-decisions.md`.

### No WAF

Out of scope for a local-Docker demo. In production: Cloudflare or AWS WAF in front, rate limit + geo block + bot signal. The internal rate limiter doesn't go away, it stays as the second layer.

### No audit log

DELETE removes the row. There's no `audit_events` table recording who did what and when. With auth this would be the first add — even before soft delete. Today: not in scope.

### No request signing

The API doesn't expose any high-value endpoints (no money, no PII). Request signing (HMAC over body + timestamp) would be appropriate for an API that did, and isn't here.

### No fuzzing

Validation is hand-tested in the integration suite. Property-based tests on the Zod schemas would be a nice next step (fast-check). Out of scope.

## What production would add

In the order I'd reach for them:

1. **Real auth.** Either Lucia (session-based) or a third-party identity provider (Auth0, Clerk, WorkOS). With multi-tenancy, that's a `tenantId` plus row-level security in Postgres.
2. **Audit log.** `audit_events` table capturing every mutation: actor, action, resource id, before/after diff. Append-only, no DELETE on the audit table itself.
3. **Secrets manager.** Env vars are fine for local dev; production uses AWS Secrets Manager / Vault / Doppler. The boot-time Zod parse stays the same; only the source of values changes.
4. **WAF + bot management.** Cloudflare in front. Rate limits stay as a second layer.
5. **Dependency scanning.** Snyk or `npm audit` integrated into CI, with auto-PRs for safe patches.
6. **SAST.** GitHub Advanced Security or a similar scanner on the codebase.
7. **Penetration test.** Once a year for a real product, not for a demo.
8. **Bug bounty.** Once the codebase is mature enough that the signal-to-noise of reports would be worth the program management overhead.

## Threat model summary

A short version of "what could go wrong with this thing as built":

| Threat | Mitigation in place | Residual risk |
|---|---|---|
| Brute-force on endpoints | Rate limit per IP | Distributed IPs would bypass. WAF is the answer. |
| Resource enumeration via sequential ids | cuid primary key | Low. cuid is not predictable enough to enumerate practically. |
| Oversized request body OOM | 1mb body limit | None at this layer. |
| Injection via string fields | Prisma parameterized queries; Zod validation | None known. We never use `$executeRaw` with input. |
| XSS via stored content | Web app renders user content with React's default escaping | None for plain text. If we added markdown or HTML rendering, sanitization would be required. |
| CSRF | No cookies; bearer-token-only contract (when auth added) | None at this layer. |
| Unauthorized access to data | None — there's no auth | This is the explicit accepted risk of a no-auth demo. Documented. |
| Cache poisoning | Cache keyed on parsed query, not raw query string. Mutations invalidate. | Low. |
| Resource exhaustion via expensive queries | Pagination caps `limit` to 100; ILIKE has DB-level cost ceiling at small data | Could grow if data grows past ~100K rows; FTS is the answer. |
| Information disclosure via error messages | Error envelope strips stack in non-debug routes | None. The requestId enables log correlation without exposing internals. |

The biggest accepted risk is the absence of auth. Everything else is in place or has a documented mitigation.
