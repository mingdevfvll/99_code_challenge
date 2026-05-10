'use client';

import { Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TaskCard, TaskRow } from './task-row';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import type { Task, TaskStatus } from '@/schemas/task';

// The table renders one of four states (`docs/05-frontend-design.md` §3-state UX):
//   1. Initial loading      → skeleton rows that match real row height
//   2. Background refetch   → existing data + thin top progress bar
//   3. Error                → ErrorState replacing the body
//   4. Empty                → EmptyState replacing the body
// Plus the actual data path. Keeping all four in one component because they
// share the chrome (column headers + load-more affordance) and bouncing
// between them reads cleanly here.

type TaskTableProps = {
  tasks: Task[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
};

export function TaskTable({
  tasks,
  isLoading,
  isFetching,
  isError,
  error,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onRetry,
  hasActiveFilters,
  onClearFilters,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskTableProps) {
  return (
    <section
      aria-label="Task list"
      className="border-border/70 bg-card/90 relative overflow-hidden rounded-xl border shadow-sm backdrop-blur"
    >
      {isFetching && !isLoading ? (
        <div className="from-primary/40 via-primary to-primary/40 absolute inset-x-0 top-0 h-0.5 animate-pulse bg-gradient-to-r" />
      ) : null}

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border/60 bg-muted/30 text-muted-foreground border-b text-left text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Task</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="w-12 px-4 py-3" aria-label="Row actions" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? <SkeletonRows /> : null}
            {!isLoading && !isError && tasks.length > 0 ? (
              <AnimatePresence initial={false}>
                {tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </AnimatePresence>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {isLoading ? <MobileSkeletonRows /> : null}
        {!isLoading && !isError && tasks.length > 0 ? (
          <AnimatePresence initial={false}>
            {tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
              />
            ))}
          </AnimatePresence>
        ) : null}
      </div>

      {!isLoading && isError ? (
        <div className="px-4 py-6">
          <ErrorState error={error} onRetry={onRetry} />
        </div>
      ) : null}

      {!isLoading && !isError && tasks.length === 0 ? (
        <div className="px-4 py-6">
          <EmptyState
            variant={hasActiveFilters ? 'no-matches' : 'no-tasks'}
            onAction={hasActiveFilters ? onClearFilters : undefined}
          />
        </div>
      ) : null}

      {!isLoading && !isError && tasks.length > 0 ? (
        <div className="border-border/60 bg-muted/20 flex items-center justify-between border-t px-4 py-3">
          <span className="text-muted-foreground text-xs">
            Showing {tasks.length} task{tasks.length === 1 ? '' : 's'}
            {hasNextPage ? ' (more available)' : ''}
          </span>
          {hasNextPage ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isFetchingNextPage}
              className="gap-1.5"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Loading…
                </>
              ) : (
                'Load more'
              )}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function SkeletonRows() {
  // Five skeleton rows to fill the initial render area. Heights match real
  // rows so there's no layout shift when data lands.
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className={cn('border-border/40 border-b')}>
          <td className="px-4 py-3">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-20 rounded-full" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-16 rounded-full" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-16" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="ml-auto h-7 w-7 rounded-md" />
          </td>
        </tr>
      ))}
    </>
  );
}

function MobileSkeletonRows() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border-border/60 rounded-lg border p-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
