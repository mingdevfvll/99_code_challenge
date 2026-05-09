'use client';

import * as React from 'react';
import { TaskTable } from '@/components/task-table';
import { TaskFiltersBar } from '@/components/task-filters-bar';
import { useTaskFilters } from '@/hooks/use-task-filters';
import { useTasksQuery } from '@/hooks/use-tasks-query';
import type { Task } from '@/schemas/task';

// Single client component that owns the filters/query/table dance. Kept
// separate from `page.tsx` so the route file stays a server component and
// the client boundary is one ergonomic spot.

export function TasksView() {
  const { filters, setFilters, clearFilters, hasActiveFilters } = useTaskFilters();
  const query = useTasksQuery(filters);

  const tasks: Task[] = React.useMemo(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  );

  return (
    <div className="flex flex-col gap-4">
      <TaskFiltersBar
        filters={filters}
        setFilters={setFilters}
        clearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <TaskTable
        tasks={tasks}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        isError={query.isError}
        error={query.error}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        onLoadMore={() => query.fetchNextPage()}
        onRetry={() => query.refetch()}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
