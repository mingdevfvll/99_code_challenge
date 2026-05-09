'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  taskPriorityEnum,
  taskStatusEnum,
  type TaskFilters,
  type TaskPriority,
  type TaskSort,
  type TaskStatus,
} from '@/schemas/task';

// One-stop hook for reading and writing the filter state. URL is the source
// of truth (back/forward navigation gives the previous filter set, links are
// shareable, refresh preserves filters). The local `q` mirror lets the input
// stay snappy while the URL update is debounced.

const ALLOWED_SORTS = new Set<TaskSort>([
  '-createdAt',
  'createdAt',
  'dueDate',
  '-dueDate',
  '-priority',
  'priority',
  'title',
  '-title',
]);

function parseFilters(params: URLSearchParams): TaskFilters {
  const out: TaskFilters = {};

  const q = params.get('q');
  if (q) out.q = q;

  const status = params.getAll('status').filter((v): v is TaskStatus => taskStatusEnum.safeParse(v).success);
  if (status.length) out.status = status;

  const priority = params.getAll('priority').filter((v): v is TaskPriority => taskPriorityEnum.safeParse(v).success);
  if (priority.length) out.priority = priority;

  const dueBefore = params.get('dueBefore');
  if (dueBefore) out.dueBefore = dueBefore;

  const dueAfter = params.get('dueAfter');
  if (dueAfter) out.dueAfter = dueAfter;

  const tags = params.get('tags');
  if (tags) {
    const parts = tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (parts.length) out.tags = parts;
  }

  const sort = params.get('sort');
  if (sort && ALLOWED_SORTS.has(sort as TaskSort)) out.sort = sort as TaskSort;

  return out;
}

function filtersToParams(filters: TaskFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  filters.status?.forEach((s) => params.append('status', s));
  filters.priority?.forEach((p) => params.append('priority', p));
  if (filters.dueBefore) params.set('dueBefore', filters.dueBefore);
  if (filters.dueAfter) params.set('dueAfter', filters.dueAfter);
  if (filters.tags?.length) params.set('tags', filters.tags.join(','));
  if (filters.sort) params.set('sort', filters.sort);
  return params;
}

export type SetFilters = (next: TaskFilters | ((prev: TaskFilters) => TaskFilters)) => void;

export function useTaskFilters(): {
  filters: TaskFilters;
  setFilters: SetFilters;
  clearFilters: () => void;
  hasActiveFilters: boolean;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = React.useMemo(
    () => parseFilters(new URLSearchParams(searchParams?.toString() ?? '')),
    [searchParams],
  );

  const setFilters = React.useCallback<SetFilters>(
    (next) => {
      const value = typeof next === 'function' ? next(filters) : next;
      const params = filtersToParams(value);
      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      // `replace` (not push) so filter changes don't fill back history with
      // intermediate states.
      router.replace(url, { scroll: false });
    },
    [filters, pathname, router],
  );

  const clearFilters = React.useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const hasActiveFilters =
    Boolean(filters.q) ||
    Boolean(filters.status?.length) ||
    Boolean(filters.priority?.length) ||
    Boolean(filters.dueBefore) ||
    Boolean(filters.dueAfter) ||
    Boolean(filters.tags?.length) ||
    Boolean(filters.sort);

  return { filters, setFilters, clearFilters, hasActiveFilters };
}
