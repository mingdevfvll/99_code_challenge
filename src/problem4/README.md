# Problem 6: Architecture

## Task

Write the specification for a software module on the API service (backend application server).

1. Create a documentation for this module on a `README.md` file.
2. Create a diagram to illustrate the flow of execution. 
3. Add additional comments for improvement you may have in the documentation.
4. Your specification will be given to a backend engineering team to implement.

### Software Requirements

1. We have a website with a score board, which shows the top 10 user’s scores.
2. We want live update of the score board.
3. User can do an action (which we do not need to care what the action is), completing this action will increase the user’s score.
4. Upon completion the action will dispatch an API call to the application server to update the score.
5. We want to prevent malicious users from increasing scores without authorisation.

---

# Scoreboard Service — Technical Specification

**Module:** `scoreboard-service`  
**Version:** 1.0.0  
**Status:** Draft — Pending Engineering Review  
**Authors:** Backend Platform Team  
**Last Updated:** 2024-01-01

---

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Architecture](#architecture)
4. [Security Model](#security-model)
5. [API Reference](#api-reference)
6. [WebSocket Protocol](#websocket-protocol)
7. [Data Models](#data-models)
8. [Error Handling](#error-handling)
9. [Usage Examples](#usage-examples)
10. [Threat Model](#threat-model)
11. [Improvements & Future Considerations](#improvements--future-considerations)

---

## Overview

The Scoreboard Service is a backend module responsible for:

- Maintaining a **real-time leaderboard** of the top 10 users by score
- Securely processing **score update requests** triggered by user-completed actions
- Broadcasting **live scoreboard updates** to all connected clients via WebSocket
- Enforcing **authorization and integrity checks** to prevent fraudulent score manipulation

This specification follows the **Signed One-Time Token** pattern to validate score update requests without exposing score mutation endpoints to direct client abuse.

---

## System Requirements

| Requirement | Detail |
|-------------|--------|
| Show top 10 users by score | Leaderboard sorted descending, updated in real time |
| Live updates | Scoreboard reflects changes within ≤ 500ms of a valid score update |
| Score increment on action | Each completed action increments the user's score by a server-defined delta |
| Prevent unauthorized updates | Score updates require a valid, unexpired, single-use signed token |
| Horizontal scalability | Service must scale across multiple instances without losing real-time consistency |

---

## Architecture

![Architecture — scoreboard service (component flow)](../../../docs/images/prob_6.png)

### Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                       │
│                                                                 │
│   1. Request Action Token          4. Submit Score Update       │
│   GET /api/actions/token      POST /api/scores/update + token   │
│                                                                 │
│   5. Receive live scoreboard updates via WebSocket              │
│   WS  /ws/scoreboard                                            │
└────────────┬──────────────────────────────┬────────────────────┘
             │                              │
             ▼                              ▼
┌────────────────────┐          ┌───────────────────────┐
│   Action Service   │          │    Score Service       │
│                    │          │                        │
│ • Issue signed JWT │          │ • Verify JWT signature │
│ • Define score     │          │ • Check token not used │
│   delta per action │          │ • Atomic score incr.   │
│ • Short TTL (60s)  │          │ • Publish update event │
└────────────────────┘          └──────────┬────────────┘
                                           │
                                           ▼
                                ┌─────────────────────┐
                                │   Redis              │
                                │                      │
                                │ • Sorted Set (ZSET)  │
                                │   leaderboard scores │
                                │ • Token blacklist    │
                                │   (used tokens)      │
                                │ • Pub/Sub channel    │
                                │   scoreboard:update  │
                                └──────────┬──────────┘
                                           │ PUBLISH
                                    ┌──────┴──────┐
                                    ▼             ▼
                             ┌──────────┐  ┌──────────┐
                             │ WS Node1 │  │ WS Node2 │
                             └──────────┘  └──────────┘
                                  │              │
                             [Clients...]   [Clients...]
```

### Technology Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Runtime | Node.js + NestJS | Modular, production-grade framework |
| Primary store | Redis (Sorted Set) | O(log N) ranked inserts, atomic `ZINCRBY` |
| Token blacklist | Redis (SET + TTL) | O(1) lookup, auto-expiry matches token TTL |
| Real-time | WebSocket + Redis Pub/Sub | Fan-out across multiple server instances |
| Auth tokens | JWT (HS256) | Compact, stateless signature verification |
| Secret storage | Environment variable / Vault | Never hardcoded |

---

## Security Model

### Core Principle

**The client never controls the score delta.** The server defines what each action is worth at token issuance time. The client only presents the token — it cannot alter its contents.

### Signed One-Time Token Flow

```
Step 1 — Token Issuance
  Client authenticates and starts an action.
  Action Service issues a signed JWT encoding:
    - user_id      : who earns the score
    - action_id    : globally unique UUID (prevents duplication)
    - action_type  : type of action performed
    - score_delta  : server-defined increment (e.g. 1)
    - issued_at    : Unix timestamp
    - expires_at   : issued_at + 60 seconds (short TTL)
  Token is signed with HMAC-SHA256 using a server-side secret.

Step 2 — Action Completion
  User completes the action on the client side.

Step 3 — Score Update Request
  Client sends POST /api/scores/update with the token.
  Score Service performs sequential validation:
    [1] Verify JWT signature         → reject if tampered
    [2] Check token not expired      → reject if TTL exceeded
    [3] Check action_id not in Redis blacklist → reject if replayed
    [4] Verify user_id matches authenticated session → reject if mismatched
    [5] Write action_id to Redis blacklist with TTL = token expiry
    [6] Atomic ZINCRBY on leaderboard sorted set
    [7] Publish update event to Redis Pub/Sub

Step 4 — Live Broadcast
  All WebSocket servers subscribed to Redis channel receive the event.
  Each server pushes updated top-10 to its connected clients.
```

### Why Each Step Matters

| Validation | Attack Prevented |
|-----------|-----------------|
| JWT signature check | Tampered tokens (altered score_delta, user_id) |
| Token expiry (60s TTL) | Stolen token used after the fact |
| One-time blacklist | Replay attacks — same token submitted multiple times |
| Session user_id match | Token stolen from another user and submitted |
| Server-defined score_delta | Client-side score manipulation |
| Atomic Redis ZINCRBY | Race conditions — concurrent requests corrupting score |

---

## API Reference

### Base URL

```
https://api.example.com/v1
```

### Authentication

All endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <session_jwt>
```

Session JWTs are issued by the authentication service (outside scope of this module).

---

### POST `/actions/token`

Request a one-time score token before performing an action.

**Request**

```http
POST /api/v1/actions/token
Authorization: Bearer <session_jwt>
Content-Type: application/json

{
  "action_type": "complete_task"
}
```

**Response — 200 OK**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2024-01-01T12:00:60Z",
  "action_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response — 401 Unauthorized**

```json
{
  "error": "UNAUTHENTICATED",
  "message": "Valid session required to request an action token."
}
```

**Response — 429 Too Many Requests**

```json
{
  "error": "RATE_LIMITED",
  "message": "Token request limit exceeded. Retry after 30 seconds.",
  "retry_after": 30
}
```

> **Note:** Token issuance is rate-limited to **10 requests per minute per user** to prevent token farming attacks.

---

### POST `/scores/update`

Submit a completed action and update the user's score.

**Request**

```http
POST /api/v1/scores/update
Authorization: Bearer <session_jwt>
Content-Type: application/json

{
  "action_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "score": {
    "previous": 142,
    "delta": 1,
    "current": 143
  },
  "rank": 7
}
```

**Response — 400 Bad Request — Token Expired**

```json
{
  "error": "TOKEN_EXPIRED",
  "message": "The action token has expired. Request a new token and retry."
}
```

**Response — 400 Bad Request — Token Already Used**

```json
{
  "error": "TOKEN_REPLAYED",
  "message": "This action token has already been used."
}
```

**Response — 400 Bad Request — Token Invalid**

```json
{
  "error": "TOKEN_INVALID",
  "message": "The action token signature is invalid."
}
```

**Response — 403 Forbidden — User Mismatch**

```json
{
  "error": "USER_MISMATCH",
  "message": "The action token does not belong to the authenticated user."
}
```

---

### GET `/scores/leaderboard`

Fetch the current top 10 leaderboard. Used for initial page load before WebSocket connection is established.

**Request**

```http
GET /api/v1/scores/leaderboard
```

> No authentication required — leaderboard is public.

**Response — 200 OK**

```json
{
  "leaderboard": [
    { "rank": 1, "user_id": "usr_abc", "username": "alice",   "score": 9420 },
    { "rank": 2, "user_id": "usr_def", "username": "bob",     "score": 8751 },
    { "rank": 3, "user_id": "usr_ghi", "username": "charlie", "score": 7103 }
  ],
  "updated_at": "2024-01-01T12:00:55Z"
}
```

---

## WebSocket Protocol

### Connection

```
wss://api.example.com/ws/scoreboard
```

No authentication required for the scoreboard feed — it is a public read-only stream.

### Connection Lifecycle

```
Client                          Server
  │                               │
  ├── WS Upgrade Request ────────►│
  │                               │ Subscribe to Redis channel
  │◄─── Connection Confirmed ─────┤
  │                               │
  │◄─── Initial Snapshot ─────────┤  (top 10 on connect)
  │                               │
  │          ... time passes ...  │
  │                               │ Score update event received
  │◄─── Scoreboard Update ────────┤
  │◄─── Scoreboard Update ────────┤
  │                               │
  ├── Ping ────────────────────── │  (every 30s)
  │◄─── Pong ─────────────────────┤
```

### Message Format

**Server → Client: Initial Snapshot (on connect)**

```json
{
  "type": "SNAPSHOT",
  "payload": {
    "leaderboard": [
      { "rank": 1, "user_id": "usr_abc", "username": "alice",   "score": 9420 },
      { "rank": 2, "user_id": "usr_def", "username": "bob",     "score": 8751 },
      { "rank": 3, "user_id": "usr_ghi", "username": "charlie", "score": 7103 }
    ],
    "updated_at": "2024-01-01T12:00:55Z"
  }
}
```

**Server → Client: Live Update**

```json
{
  "type": "UPDATE",
  "payload": {
    "leaderboard": [
      { "rank": 1, "user_id": "usr_abc", "username": "alice",   "score": 9421, "delta": 1 },
      { "rank": 2, "user_id": "usr_def", "username": "bob",     "score": 8751, "delta": 0 }
    ],
    "updated_at": "2024-01-01T12:01:02Z"
  }
}
```

> `delta` field is non-zero only for the user whose score changed in this event. Clients may use this to animate the score increment.

---

## Data Models

### Redis Sorted Set — Leaderboard

```
Key:    leaderboard:scores
Type:   Sorted Set (ZSET)
Member: user_id
Score:  cumulative score (float)

Commands:
  ZINCRBY leaderboard:scores 1 {user_id}    # atomic increment
  ZREVRANGE leaderboard:scores 0 9 WITHSCORES  # top 10
```

### Redis SET — Token Blacklist

```
Key:    used_token:{action_id}
Type:   String ("1")
TTL:    Matches token expiry (max 60 seconds)

Commands:
  SET used_token:{action_id} 1 EX 60 NX    # NX = only set if not exists
  # Returns OK if first use, nil if replayed
```

Using `SET ... NX` (atomic set-if-not-exists) as a **compare-and-set** operation prevents race conditions on concurrent replay attempts.

### Redis Pub/Sub — Scoreboard Events

```
Channel:  scoreboard:update
Message:  JSON string of top-10 leaderboard payload
```

### JWT Token Claims

```json
{
  "iss": "action-service",
  "sub": "{user_id}",
  "jti": "{action_id}",
  "action_type": "complete_task",
  "score_delta": 1,
  "iat": 1693291840,
  "exp": 1693291900
}
```

| Claim | Description |
|-------|-------------|
| `iss` | Issuer — must be `"action-service"` |
| `sub` | User ID — must match authenticated session |
| `jti` | JWT ID — globally unique, used as blacklist key |
| `action_type` | Type of action — for audit logging |
| `score_delta` | Score increment — server-defined, not client-controlled |
| `iat` | Issued at timestamp |
| `exp` | Expiry — `iat + 60` seconds |

---

## Error Handling

### Error Response Shape

All error responses follow a consistent shape:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description.",
  "request_id": "req_abc123"
}
```

`request_id` is a unique identifier for every request, logged server-side. Include it when reporting issues.

### Error Code Registry

| Code | HTTP Status | Description |
|------|------------|-------------|
| `UNAUTHENTICATED` | 401 | No valid session token provided |
| `TOKEN_INVALID` | 400 | JWT signature verification failed |
| `TOKEN_EXPIRED` | 400 | JWT `exp` claim is in the past |
| `TOKEN_REPLAYED` | 400 | `action_id` already exists in blacklist |
| `USER_MISMATCH` | 403 | Token `sub` does not match session user |
| `RATE_LIMITED` | 429 | Token issuance rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error — retry with backoff |

---

## Usage Examples

### Full Client Flow (TypeScript)

```typescript
const API_BASE = 'https://api.example.com/v1';
const WS_URL  = 'wss://api.example.com/ws/scoreboard';

// Step 1 — Connect to live scoreboard on page load
function connectScoreboard(onUpdate: (data: Leaderboard) => void) {
  const ws = new WebSocket(WS_URL);

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'SNAPSHOT' || msg.type === 'UPDATE') {
      onUpdate(msg.payload.leaderboard);
    }
  };

  ws.onclose = () => {
    // Reconnect with exponential backoff
    setTimeout(() => connectScoreboard(onUpdate), 2000);
  };

  return ws;
}

// Step 2 — Request a one-time token before user starts an action
async function requestActionToken(sessionJwt: string): Promise<string> {
  const res = await fetch(`${API_BASE}/actions/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action_type: 'complete_task' }),
  });

  if (!res.ok) throw new Error('Failed to request action token');

  const { token } = await res.json();
  return token;
}

// Step 3 — After user completes the action, submit the token
async function submitScoreUpdate(
  sessionJwt: string,
  actionToken: string
): Promise<{ previous: number; current: number; rank: number }> {
  const res = await fetch(`${API_BASE}/scores/update`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action_token: actionToken }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message);
  }

  const { score, rank } = await res.json();
  return { previous: score.previous, current: score.current, rank };
}

// --- Putting it all together ---
async function handleActionComplete(sessionJwt: string) {
  try {
    // Token was ideally requested when action started, not on completion.
    // Here shown together for brevity.
    const token = await requestActionToken(sessionJwt);

    // ... user completes action ...

    const result = await submitScoreUpdate(sessionJwt, token);
    console.log(`Score updated: ${result.previous} → ${result.current} (Rank #${result.rank})`);
  } catch (err) {
    console.error('Score update failed:', err.message);
  }
}
```

### WebSocket Reconnection with Exponential Backoff

```typescript
function connectWithBackoff(
  onUpdate: (data: Leaderboard) => void,
  attempt = 0
) {
  const delay = Math.min(1000 * 2 ** attempt, 30_000); // cap at 30s
  setTimeout(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen    = () => { attempt = 0; }; // reset on success
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'SNAPSHOT' || msg.type === 'UPDATE') {
        onUpdate(msg.payload.leaderboard);
      }
    };
    ws.onclose   = () => connectWithBackoff(onUpdate, attempt + 1);
    ws.onerror   = () => ws.close();
  }, delay);
}
```

---

## Threat Model

### Identified Attack Vectors

| # | Attack | Vector | Mitigation |
|---|--------|--------|-----------|
| 1 | **Direct API abuse** | User calls `POST /scores/update` without completing an action | Token required — cannot be self-issued without server secret |
| 2 | **Replay attack** | Capture a valid token, submit it multiple times | `action_id` blacklisted in Redis on first use via atomic `SET NX` |
| 3 | **Score tampering** | Modify `score_delta` in the JWT payload | JWT signature verification — any payload change invalidates the signature |
| 4 | **Token theft + substitution** | Steal another user's token and submit under own session | `sub` claim in token must match authenticated session user |
| 5 | **Token farming** | Request hundreds of tokens without completing actions | Rate limit: 10 token requests per user per minute |
| 6 | **Expired token abuse** | Store a token and submit it later | `exp` claim enforced — 60 second TTL is intentionally short |
| 7 | **Brute-force signature** | Guess the HMAC-SHA256 signing secret | 256-bit secret minimum, rotated regularly, stored in Vault |
| 8 | **Race condition exploit** | Submit the same token concurrently from multiple clients | Redis `SET NX` is atomic — only one request wins, all others get `TOKEN_REPLAYED` |
| 9 | **WebSocket scoreboard manipulation** | Inject forged WebSocket messages | WebSocket is **server-push only** — clients cannot send score-affecting messages |
| 10 | **Enumeration / IDOR** | Iterate user IDs to probe scores | Leaderboard only exposes top 10 — no endpoint to query arbitrary user scores |
| 11 | **Man-in-the-Middle** | Intercept token in transit | All traffic over TLS (HTTPS / WSS) — enforced at infrastructure level |
| 12 | **Distributed replay via multiple IPs** | Multiple machines replaying same token | Blacklist is global (Redis) — not per-server or per-IP |

---

## Improvements & Future Considerations

> The following are improvements beyond the current specification scope.
> Recommended for v1.1+ planning.

### 1. Token Binding to Action Initiation Timestamp

Currently, a token issued but never used within 60s simply expires. A more robust pattern is to **bind the token to a server-recorded action start event**. This ensures a token can only be redeemed if the server previously recorded that the action began — preventing tokens being requested speculatively.

### 2. Score Delta Variability by Action Type

The current spec uses a fixed `score_delta = 1`. Future action types (e.g. daily bonus, streak multiplier) may warrant different deltas. The `action_type` claim already exists in the JWT — Score Service can maintain a server-side action-type-to-delta mapping rather than trusting the token's `score_delta` directly. This further hardens against token tampering.

### 3. Audit Log

Every score update (successful or rejected) should be appended to an immutable audit log (e.g. append-only table or event stream). This enables:
- Post-hoc fraud investigation
- Anomaly detection (user with sudden spike in score)
- Compliance requirements

### 4. Anomaly Detection

Integrate a scoring anomaly detector that monitors:
- Score velocity (N updates within T seconds from one user)
- Geographic anomalies (token issued in Singapore, redeemed from Brazil within 5s)
- Action-type frequency outliers

Flag suspicious accounts for manual review or automatic temporary suspension.

### 5. Leaderboard Pagination

Top 10 is the current requirement. A paginated leaderboard endpoint (`?page=2&size=10`) and personal rank endpoint (`GET /scores/me/rank`) would improve UX at no additional infrastructure cost.

### 6. WebSocket Authentication (Optional)

If the scoreboard ever becomes private (e.g. per-game or per-team leaderboards), the WebSocket endpoint should accept the session JWT as a query parameter or `Sec-WebSocket-Protocol` header during the upgrade handshake.

### 7. Score Snapshot Persistence

Redis is an in-memory store. A scheduled job should snapshot leaderboard state to a persistent database (PostgreSQL) every N minutes to prevent data loss on Redis failure.

### 8. Token Issuance Server-Side Only

For highest security, remove the client-initiated token request entirely. Action completion should be verified server-side (e.g. the game/task server calls Score Service directly). This eliminates the entire client attack surface. Recommended if action completion can be deterministically verified on the backend.