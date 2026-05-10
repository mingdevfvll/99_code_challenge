'use client';

import * as React from 'react';
import { ArrowUpDown, Check, Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  taskPriorityEnum,
  taskSortOptions,
  taskStatusEnum,
  type TaskFilters,
  type TaskPriority,
  type TaskSort,
  type TaskStatus,
} from '@/schemas/task';

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  ARCHIVED: 'Archived',
};
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

type Props = {
  filters: TaskFilters;
  setFilters: (next: TaskFilters | ((prev: TaskFilters) => TaskFilters)) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
};

export function TaskFiltersBar({ filters, setFilters, clearFilters, hasActiveFilters }: Props) {
  // Local mirror of `q` so the input is always responsive. The URL is updated
  // 300ms after the user stops typing.
  const [qLocal, setQLocal] = React.useState(filters.q ?? '');
  const debounced = useDebouncedValue(qLocal, 300);

  // "Reset state when prop changes" pattern from the React docs: store the
  // last URL value alongside the local one, and reconcile during render when
  // they diverge externally (e.g., Clear all). Normalize undefined → '' on
  // both sides so the comparison is stable across renders — without that,
  // `undefined !== ''` triggers an infinite render loop.
  const urlQ = filters.q ?? '';
  const [lastUrlQ, setLastUrlQ] = React.useState(urlQ);
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ);
    setQLocal(urlQ);
  }

  // Push to URL when the debounced value differs. Wrapped in an effect so we
  // don't trigger navigation during render. This is the legitimate effect
  // use case: syncing React state out to an external system (the router).
  React.useEffect(() => {
    if ((filters.q ?? '') === debounced) return;
    setFilters((prev) => ({ ...prev, q: debounced || undefined }));
  }, [debounced, filters.q, setFilters]);

  const setStatus = (s: TaskStatus, checked: boolean) => {
    setFilters((prev) => {
      const cur = new Set(prev.status ?? []);
      if (checked) cur.add(s);
      else cur.delete(s);
      const next = Array.from(cur);
      return { ...prev, status: next.length ? next : undefined };
    });
  };

  const setPriority = (p: TaskPriority, checked: boolean) => {
    setFilters((prev) => {
      const cur = new Set(prev.priority ?? []);
      if (checked) cur.add(p);
      else cur.delete(p);
      const next = Array.from(cur);
      return { ...prev, priority: next.length ? next : undefined };
    });
  };

  const setSort = (sort: TaskSort | undefined) => {
    setFilters((prev) => ({ ...prev, sort }));
  };
  const activeCount =
    (filters.status?.length ?? 0) +
    (filters.priority?.length ?? 0) +
    (filters.q ? 1 : 0) +
    (filters.tags?.length ? 1 : 0) +
    (filters.sort ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        <FilterControls
          qLocal={qLocal}
          setQLocal={setQLocal}
          filters={filters}
          setFilters={setFilters}
          clearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          setStatus={setStatus}
          setPriority={setPriority}
          setSort={setSort}
        />
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" size="sm" className="flex-1 gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                Filters
                {activeCount > 0 ? (
                  <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[11px] font-medium">
                    {activeCount}
                  </span>
                ) : null}
              </Button>
            }
          />
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Search, filter, and sort tasks.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-3 px-4 pb-4">
              <FilterControls
                qLocal={qLocal}
                setQLocal={setQLocal}
                filters={filters}
                setFilters={setFilters}
                clearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters}
                setStatus={setStatus}
                setPriority={setPriority}
                setSort={setSort}
                mobile
              />
            </div>
          </SheetContent>
        </Sheet>

        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        ) : null}
      </div>

      <ActiveFilterChips filters={filters} setFilters={setFilters} />
    </div>
  );
}

function FilterControls({
  qLocal,
  setQLocal,
  filters,
  setFilters,
  clearFilters,
  hasActiveFilters,
  setStatus,
  setPriority,
  setSort,
  mobile = false,
}: {
  qLocal: string;
  setQLocal: (value: string) => void;
  filters: TaskFilters;
  setFilters: Props['setFilters'];
  clearFilters: () => void;
  hasActiveFilters: boolean;
  setStatus: (status: TaskStatus, checked: boolean) => void;
  setPriority: (priority: TaskPriority, checked: boolean) => void;
  setSort: (sort: TaskSort | undefined) => void;
  mobile?: boolean;
}) {
  return (
    <>
      <div className={cn('relative', mobile ? 'w-full' : 'min-w-[220px] flex-1')}>
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder="Search title or description…"
          value={qLocal}
          onChange={(e) => setQLocal(e.target.value)}
          aria-label="Search tasks"
          className="pl-9"
        />
      </div>

      <div className={cn(mobile ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap items-center gap-2')}>
        <FilterDropdown
          label="Status"
          activeCount={filters.status?.length ?? 0}
          options={taskStatusEnum.options.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          selected={new Set(filters.status ?? [])}
          onCheckedChange={(v, checked) => setStatus(v as TaskStatus, checked)}
          onClear={() => setFilters((prev) => ({ ...prev, status: undefined }))}
        />

        <FilterDropdown
          label="Priority"
          activeCount={filters.priority?.length ?? 0}
          options={taskPriorityEnum.options.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
          selected={new Set(filters.priority ?? [])}
          onCheckedChange={(v, checked) => setPriority(v as TaskPriority, checked)}
          onClear={() => setFilters((prev) => ({ ...prev, priority: undefined }))}
        />

        <SortDropdown sort={filters.sort} onSelect={setSort} />

        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className={cn('gap-1.5', mobile && 'col-span-2', !mobile && 'ml-auto')}
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </Button>
        ) : null}
      </div>
    </>
  );
}

// ---------- Sub-components ---------- //

function FilterDropdown({
  label,
  activeCount,
  options,
  selected,
  onCheckedChange,
  onClear,
}: {
  label: string;
  activeCount: number;
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: Set<string>;
  onCheckedChange: (value: string, checked: boolean) => void;
  onClear: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5 rounded-full border-border/80 bg-card/80 px-3 shadow-sm hover:bg-accent',
              activeCount > 0 && 'border-primary/40 bg-primary/5 text-primary',
            )}
          >
            {label}
            {activeCount > 0 ? (
              <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[11px] font-medium">
                {activeCount}
              </span>
            ) : null}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-52 p-1.5">
        <DropdownMenuLabel className="text-xs">{label}</DropdownMenuLabel>
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.value}
            closeOnClick={false}
            checked={selected.has(opt.value)}
            onCheckedChange={(checked) => onCheckedChange(opt.value, checked)}
            className="py-1.5"
          >
            {opt.label}
          </DropdownMenuCheckboxItem>
        ))}
        {activeCount > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClear} className="text-muted-foreground text-xs">
              Clear {label.toLowerCase()}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortDropdown({
  sort,
  onSelect,
}: {
  sort: TaskSort | undefined;
  onSelect: (sort: TaskSort | undefined) => void;
}) {
  const current = taskSortOptions.find((o) => o.value === sort);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5 rounded-full border-border/80 bg-card/80 px-3 shadow-sm hover:bg-accent',
              sort && sort !== '-createdAt' && 'border-primary/40 bg-primary/5 text-primary',
            )}
          >
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
            Sort: {current ? current.label : 'Newest'}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-56 p-1.5">
        <DropdownMenuLabel className="text-xs">Sort by</DropdownMenuLabel>
        {taskSortOptions.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onSelect(opt.value === '-createdAt' ? undefined : opt.value)}
            className="py-1.5"
          >
            {(sort ?? '-createdAt') === opt.value ? (
              <Check className="mr-2 h-3.5 w-3.5" />
            ) : (
              <span className="mr-2 inline-block w-3.5" />
            )}
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ActiveFilterChips({
  filters,
  setFilters,
}: {
  filters: TaskFilters;
  setFilters: Props['setFilters'];
}) {
  const chips: Array<{ key: string; label: string; remove: () => void }> = [];

  filters.status?.forEach((s) =>
    chips.push({
      key: `status:${s}`,
      label: `Status: ${STATUS_LABELS[s]}`,
      remove: () =>
        setFilters((prev) => ({
          ...prev,
          status: prev.status?.filter((x) => x !== s),
        })),
    }),
  );
  filters.priority?.forEach((p) =>
    chips.push({
      key: `priority:${p}`,
      label: `Priority: ${PRIORITY_LABELS[p]}`,
      remove: () =>
        setFilters((prev) => ({
          ...prev,
          priority: prev.priority?.filter((x) => x !== p),
        })),
    }),
  );
  if (filters.q) {
    chips.push({
      key: 'q',
      label: `Search: "${filters.q}"`,
      remove: () => setFilters((prev) => ({ ...prev, q: undefined })),
    });
  }
  if (filters.tags?.length) {
    chips.push({
      key: 'tags',
      label: `Tags: ${filters.tags.join(', ')}`,
      remove: () => setFilters((prev) => ({ ...prev, tags: undefined })),
    });
  }
  if (filters.sort) {
    const current = taskSortOptions.find((option) => option.value === filters.sort);
    chips.push({
      key: 'sort',
      label: `Sort: ${current?.label ?? filters.sort}`,
      remove: () => setFilters((prev) => ({ ...prev, sort: undefined })),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.remove}
          className="border-border/70 bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs shadow-sm transition-colors"
          aria-label={`Remove filter: ${c.label}`}
        >
          {c.label}
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
