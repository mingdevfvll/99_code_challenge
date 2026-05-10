'use client';

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api/tasks';
import type { TaskFilters, TaskListResponse } from '@/schemas/task';

const PAGE_SIZE = 20;

// Single key shape for every Task list variant. Mutations invalidate via
// `queryKey: ['tasks', 'list']` to wipe filtered/sorted lists at once.
export const taskListQueryKey = (filters: TaskFilters) =>
  ['tasks', 'list', filters] as const;

// Infinite query is the right fit for the cursor-paginated API: each page is
// keyed by the previous page's `nextCursor`, "Load more" appends a page, and
// React Query handles the cache-merge bookkeeping. Refetch on filter change
// resets the pages array — exactly what we want.

export function useTasksQuery(filters: TaskFilters) {
  return useInfiniteQuery<TaskListResponse, Error>({
    queryKey: taskListQueryKey(filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      tasksApi.list({ filters, cursor: pageParam as string | null, limit: PAGE_SIZE }),
    getNextPageParam: (last) => (last.pagination.hasMore ? last.pagination.nextCursor : null),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
