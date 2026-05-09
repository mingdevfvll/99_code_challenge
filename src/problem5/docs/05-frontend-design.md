# Frontend Design

> The web app is one page that matters: `/tasks`. This file covers the page, the components inside it, the hooks, and the small motion choices that hold it together.

## Page composition

```
app/
├── layout.tsx           ← <html>, providers (theme, query), global font, toaster
├── page.tsx             ← redirects to /tasks
└── tasks/
    ├── page.tsx         ← server component, renders <TasksView />
    └── [id]/page.tsx    ← optional detail route (see "Routing" below)
```

I'm building `/tasks` as the single landing surface. The detail route is opt-in: if a row needs more space than the dialog comfortably gives (long description, big tag list), the row's title links to `/tasks/:id`. For the demo, every action a reviewer will try lives on `/tasks`.

## Layout sketch

```
┌──────────────────────────────────────────────────────────────┐
│  Tasks                       [theme]   [+ New task]          │  header
├──────────────────────────────────────────────────────────────┤
│  [Search "title or description…"]                            │
│  [Status: All ▾] [Priority: All ▾] [Due ▾] [Sort: Newest ▾]  │
│  Active filters: status=TODO ✕   priority=HIGH ✕   [Clear]   │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Title                  Status     Priority   Due    ⋮  │  │
│  │ Send invoice…          TODO       HIGH       Jun 1  ⋮  │  │
│  │ Review PR              IN_PROG…   MEDIUM     —      ⋮  │  │
│  │ Fix typo in docs       DONE       LOW        —      ⋮  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│                       [ Load more ]                          │
└──────────────────────────────────────────────────────────────┘
```

**Responsive breakpoints**:

| Width | Behavior |
|---|---|
| ≥ 1024px | Full table layout above. |
| 640–1023px | Same table, hide the description column (it's not in the desktop layout either, so this is a no-op). Filter bar stacks into two rows. |
| < 640px | Switch to card list, one task per card. The `⋮` menu becomes the primary affordance. Filter bar collapses behind a "Filters" button that opens a sheet. |

## Component map

| Component | Job | Notes |
|---|---|---|
| `TasksView` | Page-level container. Owns no state; reads filters from URL via `useTaskFilters`. | Server-component-friendly shell, but the table itself is client. |
| `TaskTable` | Renders rows. Handles loading/empty/error states. | Pure render given `tasks`, `state`. |
| `TaskRow` | One task. Status dropdown, row menu. | Uses `useUpdateTask` for inline status changes. |
| `TaskFiltersBar` | The filter UI. | Reads/writes URL state via `useTaskFilters`. |
| `TaskFormDialog` | Create + edit modes. | RHF + zodResolver. The same component for both, mode prop drives default values + submit handler. |
| `TaskStatusBadge` | Color-coded status pill. | Pure. |
| `TaskPriorityBadge` | Color-coded priority pill with icon. | Pure. |
| `ConfirmDeleteDialog` | Two-step delete confirmation. | Generic enough to extract; for now lives in `components/`. |
| `EmptyState` | Friendly message when list is empty. | Two variants: "no tasks yet" and "no tasks match these filters". |
| `ErrorState` | Inline error card with retry. | Mirrors `PriceErrorCard` from `fancy-ex` in shape. |
| `ThemeToggle` | Light/dark toggle. | `next-themes` wrapper. |

Each component is a single file under `components/`. The ones with non-trivial render logic (`TaskRow`, `TaskFiltersBar`, `TaskFormDialog`) get a small JSDoc on their props at the top.

## State model

```
URL search params  ─┐
                    ├─► useTaskFilters() ─┐
useState (dialog)  ─┘                     ├─► useTasksQuery(filters) ─► API
                                          │
                                          └─► useCreateTask / Update / Delete
```

Three sources of state, no global store:

1. **URL search params** for everything that should be shareable: filters, sort, search query.
2. **Local component state** for ephemeral things: dialog open/closed, the row menu's open state.
3. **TanStack Query cache** for server data.

The thing I'm explicitly avoiding: a Zustand or Redux store. There's nothing that needs to be shared between unrelated components, and the URL is a better source of truth for filter state than any in-memory store.

### `useTaskFilters`

Reads from `useSearchParams()`, returns a typed `TaskFilters` object. Writes via `useRouter().replace(`/tasks?${searchParams}`)` so back/forward navigation gives the previous filter set.

```ts
type TaskFilters = {
  q?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  dueBefore?: string;
  dueAfter?: string;
  tags?: string[];
  sort?: string;
};
```

Debounced input on `q` (300ms) before pushing to the URL. Without that, every keystroke would replace the URL and re-fetch.

### `useTasksQuery`

```ts
useQuery({
  queryKey: ['tasks', filters],
  queryFn: () => apiClient.tasks.list(filters),
  staleTime: 30_000,           // matches API cache TTL
  placeholderData: keepPreviousData,
});
```

`keepPreviousData` so changing a filter doesn't flash the table to empty while the new query is in-flight.

### Mutation hooks

All three (`useCreateTask`, `useUpdateTask`, `useDeleteTask`) follow the same shape:

```ts
useMutation({
  mutationFn: (input) => apiClient.tasks.create(input),
  onMutate: async (input) => {
    await qc.cancelQueries({ queryKey: ['tasks'] });
    const prev = qc.getQueryData(['tasks', filters]);
    qc.setQueryData(['tasks', filters], optimisticUpdate(prev, input));
    return { prev };
  },
  onError: (_err, _input, ctx) => {
    if (ctx?.prev) qc.setQueryData(['tasks', filters], ctx.prev);
    toast.error('Could not save. Try again.');
  },
  onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
});
```

The optimistic update for create prepends the new task with a temporary id. For update, it patches the row in place. For delete, it removes the row. All three settle with a refetch so server-truth wins.

## Three-state UX

The table renders one of four states:

1. **Loading (initial)**: 5 skeleton rows that match real row dimensions exactly. No layout shift when data arrives.
2. **Loading (refetch)**: existing data stays visible (`keepPreviousData`); a thin progress bar at the top of the table indicates background work.
3. **Error**: inline error card replacing the table body. Same visual weight as `PriceErrorCard` from `fancy-ex`. Retry button calls `query.refetch()`.
4. **Empty**:
   - No filters active and zero tasks: friendly "Create your first task" CTA.
   - Filters active and zero matches: "No tasks match these filters" with a "Clear filters" button.

## Form: `TaskFormDialog`

shadcn `Dialog` + RHF + zodResolver. One component for create and edit; `mode` prop drives defaults and the submit hook.

| Field | Control | Notes |
|---|---|---|
| Title | `Input` | required, autofocus on open |
| Description | `Textarea` | 4 rows default, autosize up to 12 |
| Status | `Select` | shadcn select. Defaults to `TODO`. |
| Priority | `Select` | Defaults to `MEDIUM`. |
| Due date | `Popover` + `Calendar` | Clearable. ISO 8601 on submit. |
| Tags | chip input | See "tag input" below. |

### Tag input

This is the one component I don't have a finished design for. shadcn doesn't ship a chip/tag input, and the recipes I've seen on the community site differ on whether to use `cmdk` (combobox-style with suggestions) or a plain text input that splits on comma/enter.

The simpler version (text input + array state, comma to commit, backspace to delete) is ~40 lines. The combobox version is closer to 120 lines and gets me autosuggest from already-used tags. For Phase 7 I'm starting with the simple version. If time, I'll upgrade. Noted in `09-tasks.md`.

## Motion

Pulled from `fancy-ex` so the visual language matches across problems.

| Element | Transition |
|---|---|
| Dialog open/close | shadcn default (Radix + tailwind). Fast, no spring. |
| Row enter (after create) | 150ms `opacity 0→1, translateY 4px→0`. framer-motion. |
| Row exit (after delete) | 120ms `opacity 1→0, translateX 0→8px`. |
| Status badge change | 200ms color crossfade. |
| Skeleton shimmer | shadcn default. |

No spring-y, "look at me" animations. The point is to communicate that something happened, not to reward the user for doing it.

## A11y commitments

- All interactive elements reachable by keyboard, in a sensible tab order.
- Focus rings preserved (Tailwind `focus-visible:ring-2`).
- Dialog traps focus while open (Radix handles this).
- Status and priority badges have `aria-label` matching their visible text, plus a `title` for hover.
- Live region (`aria-live="polite"`) on the toast container for screen reader announcement of mutation results.
- Color is never the only signal: status uses both color and an icon; priority uses both color and an icon-shape.

## Things I'm not building

To keep the scope honest:

- No keyboard shortcuts beyond defaults. `j`/`k` row navigation would be nice, not worth the time.
- No drag-and-drop reorder. Order is controlled by `sort`; users can sort by anything indexed.
- No bulk actions. Single-select and individual mutations only.
- No saved views. The URL is the saved view.

If I had another day, the keyboard shortcuts and bulk actions are what I'd reach for first.
