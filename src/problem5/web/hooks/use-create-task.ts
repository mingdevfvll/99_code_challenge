'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksApi } from '@/lib/api/tasks';
import { taskListQueryKey } from '@/hooks/use-tasks-query';
import type { CreateTaskInput, Task, TaskFilters, TaskListResponse } from '@/schemas/task';

type Snapshot = Array<readonly [readonly unknown[], InfiniteData<TaskListResponse> | undefined]>;

function taskFromInput(input: CreateTaskInput): Task {
  const now = new Date().toISOString();
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? 'TODO',
    priority: input.priority ?? 'MEDIUM',
    dueDate: input.dueDate ?? null,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

export function useCreateTask(filters: TaskFilters) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.create(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'list'] });
      const previous = queryClient.getQueriesData<InfiniteData<TaskListResponse>>({
        queryKey: ['tasks', 'list'],
      }) as Snapshot;
      const optimistic = taskFromInput(input);

      queryClient.setQueryData<InfiniteData<TaskListResponse>>(taskListQueryKey(filters), (old) => {
        if (!old) {
          return {
            pages: [{ data: [optimistic], pagination: { nextCursor: null, hasMore: false } }],
            pageParams: [null],
          };
        }

        const [first, ...rest] = old.pages;
        return {
          ...old,
          pages: [
            { ...first, data: [optimistic, ...first.data] },
            ...rest,
          ],
        };
      });

      return { previous, optimisticId: optimistic.id };
    },
    onSuccess: (created, _input, context) => {
      queryClient.setQueriesData<InfiniteData<TaskListResponse>>(
        { queryKey: ['tasks', 'list'] },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  data: page.data.map((task) =>
                    task.id === context.optimisticId ? created : task,
                  ),
                })),
              }
            : old,
      );
      toast.success('Task created');
    },
    onError: (error, _input, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error('Create failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
    },
  });
}
