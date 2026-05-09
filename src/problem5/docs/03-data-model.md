# Data Model

> The schema, the indexes, and the alternatives I weighed before settling on this shape.

## Schema (canonical)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
  ARCHIVED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model Task {
  id          String       @id @default(cuid())
  title       String       @db.VarChar(200)
  description String?      @db.Text
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  dueDate     DateTime?
  tags        String[]     @default([])
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([status])
  @@index([priority])
  @@index([dueDate])
  @@index([createdAt(sort: Desc)])
  @@index([tags], type: Gin)
}
```

That's it. One table. The interesting decisions are below.

## Field-by-field rationale

### `id: String @default(cuid())`

cuid over UUID v4 for two reasons. First, it's roughly time-sortable, so default `ORDER BY id DESC` is close to `ORDER BY createdAt DESC` and the index on `createdAt` is the one I actually rely on. Second, cuids are shorter and friendlier in URLs.

The trade-off: cuid is a Prisma-ish ecosystem choice. If the rows ever have to leave Prisma (export to a system that already uses UUIDs everywhere, or merge with another dataset), translation is awkward. For a single-author 16h scope this isn't a real concern.

I considered `Int @id @default(autoincrement())`. Rejected because predictable sequential ids leak how busy the API is, and they invite enumeration. cuid removes both for free.

### `title: String @db.VarChar(200)`

200 chars cap, validated by Zod at the API boundary too. The default Prisma `String` maps to `text` in Postgres, which is fine performance-wise but doesn't communicate intent. `VarChar(200)` is a soft signal in the DB schema that this column has an upper bound.

### `description: String? @db.Text`

Optional, no length cap. Plain text only — I'm not parsing markdown or sanitizing HTML. If I did either, it would need its own service and a paragraph in `13-security.md`. Out of scope.

### `status` and `priority` enums

Postgres native enums, mapped to TS string literal unions through Prisma's generated types. Trade-off versus a string column with a CHECK constraint:

| | Postgres enum | String + CHECK |
|---|---|---|
| Add a value | `ALTER TYPE ... ADD VALUE` (one-step migration, can't be in a transaction) | edit constraint, one migration |
| Remove a value | painful: rename column, create new enum, copy, drop | drop constraint, edit, re-add |
| Type safety in app code | Prisma generates `enum` | manual |

For an internal CRUD with stable enum sets, native enums are fine. If the values were customer-defined, I'd go string + lookup table.

### `dueDate: DateTime?`

Nullable. Many tasks won't have a due date and I don't want a sentinel value (`9999-12-31`) leaking into UI logic. Indexed because "due before X" and sort-by-due are the two queries most likely to land on it.

### `tags: String[] @default([])`

Postgres `text[]`. The default is empty array, not null, so app code never has to nullcheck.

I weighed three shapes:

1. `text[]` on `Task`. (chosen)
2. `Tag` table + `TaskTag` join.
3. `tags: Json` on `Task`.

The deciding question: does a tag have any data of its own? Color, owner, count, description? In the brief, no. So shape 2's overhead (two more tables, joins on every list query, normalization for what's effectively a label) buys me nothing. Shape 3 (JSON) loses the GIN index and forces app-side parsing.

If the requirement ever grew (per-tenant tag taxonomies, tag analytics), I'd migrate to shape 2. The migration is straightforward: create the tables, copy with `unnest()`, drop the column. I'd want to do it before the data set was very large.

### `createdAt` and `updatedAt`

Standard. `updatedAt` uses Prisma's `@updatedAt` directive which writes the timestamp on every Prisma update call. That has a quiet edge case: a raw SQL update or a `prisma.$executeRaw` won't trigger it. I'm not doing either, but worth knowing.

## Index rationale

Five indexes. None are speculative; each maps to a query the API actually runs.

| Index | Used by |
|---|---|
| `@@index([status])` | `WHERE status IN (...)` filter on list. Cardinality ~4, but Postgres still uses it when status is restrictive enough. |
| `@@index([priority])` | Same shape as status. Same caveat. |
| `@@index([dueDate])` | `WHERE dueDate >= ?` and `WHERE dueDate <= ?`. Also enables range scans for the sort. |
| `@@index([createdAt(sort: Desc)])` | The default sort, and the primary cursor. The descending hint matters: a non-directional index works for forward and backward equally, but I want the planner to pick this one for the default top-N. |
| `@@index([tags], type: Gin)` | `WHERE tags && ARRAY['x']::text[]` for the tag-any-of filter. GIN is the right index type for array containment. |

What I deliberately didn't index:

- `title` and `description`. The search filter (`q`) does ILIKE on these. With small data the seq scan is fine. For real scale I'd add either a `tsvector` column with a GIN index, or push search to a dedicated tool. Documented in `06-observability.md` under "what scaling looks like."
- `id`. It's the primary key; Postgres indexes it automatically.

## Cursor pagination shape

The list endpoint uses cursor pagination, not offset. The cursor is the `id` of the last row in the previous page. Server-side decode:

```ts
// in task.repository.ts
where: cursor ? { id: { lt: cursor } } : undefined,  // lt because we sort desc by createdAt + id
orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
take: limit + 1,
```

Take `limit + 1` so we know if there's a next page without a separate count query. Slice off the extra row, surface its `id` as `nextCursor`.

The reason for sorting on `(createdAt desc, id desc)` rather than just `createdAt desc`: `createdAt` is not unique. Two tasks created in the same millisecond would otherwise have an undefined relative order between pages, and a row could appear on two pages or none. Adding `id` as a tiebreaker makes the sort total.

Custom sorts (e.g. `?sort=-dueDate,createdAt`) follow the same pattern, with the cursor encoding the last row's relevant fields. For the 16h scope I'm only implementing cursor pagination on the default sort; custom sorts use `take` and a "load more" that re-issues with offset. Documented as a known limitation in `12-retrospective.md`.

> I'm not 100% locked on this. There's a version where I encode the cursor as base64(`{ createdAt, id }`) and support cursor pagination on every sort. Worth ~45 min if Phase 4 has the budget.

## Migration strategy

`prisma migrate dev` locally; `prisma migrate deploy` in the API container at startup. Migration files commit alongside code. No automatic squashing.

Seeded data (`prisma/seed.ts`) creates ~10 tasks across all four status values and four priority values, with mixed `dueDate` values (past, near, far, null) and varied tag arrays. The point is to make the empty UI demonstrate filters immediately, not to stress-test.

`prisma db push` is not used. Schema-then-migration discipline catches things `db push` happily ignores.

## What I'd add for production

For the record, not for this submission:

- A `deletedAt` soft-delete column if there were any audit/recovery requirement. Today, hard delete is correct.
- Row-level security with `tenant_id`, if multi-tenancy were on the table.
- A `tsvector` column on `(title, description)` with a GIN index for search.
- A `version: Int @default(0)` column for optimistic concurrency on the update endpoint, surfaced as an `If-Match` header.

Each is a one-paragraph extension, not a redesign. The schema above doesn't preclude any of them.
