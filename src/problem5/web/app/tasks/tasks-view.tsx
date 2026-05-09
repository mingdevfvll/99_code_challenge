'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { TaskTable } from '@/components/task-table';
import { TaskFormDialog } from '@/components/task-form-dialog';
import { TaskFiltersBar } from '@/components/task-filters-bar';
import { ThemeToggle } from '@/components/theme-toggle';
import { useCreateTask } from '@/hooks/use-create-task';
import { useDeleteTask } from '@/hooks/use-delete-task';
import { useUpdateTask } from '@/hooks/use-update-task';
import { useTaskFilters } from '@/hooks/use-task-filters';
import { useTasksQuery } from '@/hooks/use-tasks-query';
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from '@/schemas/task';

// Single client component that owns the filters/query/table dance. Kept
// separate from `page.tsx` so the route file stays a server component and
// the client boundary is one ergonomic spot.

export function TasksView() {
  const { filters, setFilters, clearFilters, hasActiveFilters } = useTaskFilters();
  const query = useTasksQuery(filters);
  const createTask = useCreateTask(filters);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [formState, setFormState] = React.useState<{
    open: boolean;
    mode: 'create' | 'edit';
    task: Task | null;
  }>({ open: false, mode: 'create', task: null });
  const [deleteTarget, setDeleteTarget] = React.useState<Task | null>(null);

  const tasks: Task[] = React.useMemo(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  );

  async function submitForm(input: CreateTaskInput | UpdateTaskInput) {
    if (formState.mode === 'edit' && formState.task) {
      await updateTask.mutateAsync({
        id: formState.task.id,
        input: input as UpdateTaskInput,
        successMessage: 'Task updated',
      });
      return;
    }
    await createTask.mutateAsync(input as CreateTaskInput);
  }

  function openCreateDialog() {
    setFormState({ open: true, mode: 'create', task: null });
  }

  function openEditDialog(task: Task) {
    setFormState({ open: true, mode: 'edit', task });
  }

  function changeStatus(task: Task, status: TaskStatus) {
    updateTask.mutate({
      id: task.id,
      input: { status },
      successMessage: `Status set to ${STATUS_LABELS[status]}`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground text-sm">
            Track work across status, priority, and due date.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button onClick={openCreateDialog} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New task
          </Button>
        </div>
      </header>

      <Separator />

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
        onEdit={openEditDialog}
        onDelete={setDeleteTarget}
        onStatusChange={changeStatus}
      />

      {formState.open ? (
        <TaskFormDialog
          open={formState.open}
          mode={formState.mode}
          task={formState.task}
          isSubmitting={createTask.isPending || updateTask.isPending}
          onOpenChange={(open) =>
            setFormState((prev) => ({ ...prev, open, task: open ? prev.task : null }))
          }
          onSubmit={submitForm}
        />
      ) : null}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        task={deleteTarget}
        isDeleting={deleteTask.isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteTask.mutateAsync(deleteTarget.id);
        }}
      />
    </div>
  );
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  ARCHIVED: 'Archived',
};
