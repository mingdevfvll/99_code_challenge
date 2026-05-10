'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksApi } from '@/lib/api/tasks';
import type { Task, TaskListResponse, UpdateTaskInput } from '@/schemas/task';

type Snapshot = Array<readonly [readonly unknown[], InfiniteData<TaskListResponse> | undefined]>;

type UpdateArgs = {
  id: string;
  input: UpdateTaskInput;
  successMessage?: string;
};

function patchTask(task: Task, input: UpdateTaskInput): Task {
  return {
    ...task,
    ...input,
    description: input.description === undefined ? task.description : input.description ?? null,
    dueDate: input.dueDate === undefined ? task.dueDate : input.dueDate ?? null,
    tags: input.tags === undefined ? task.tags : input.tags,
    updatedAt: new Date().toISOString(),
  };
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: UpdateArgs) => tasksApi.update(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'list'] });
      const previous = queryClient.getQueriesData<InfiniteData<TaskListResponse>>({
        queryKey: ['tasks', 'list'],
      }) as Snapshot;

      queryClient.setQueriesData<InfiniteData<TaskListResponse>>(
        { queryKey: ['tasks', 'list'] },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  data: page.data.map((task) => (task.id === id ? patchTask(task, input) : task)),
                })),
              }
            : old,
      );

      return { previous };
    },
    onSuccess: (updated, variables) => {
      queryClient.setQueriesData<InfiniteData<TaskListResponse>>(
        { queryKey: ['tasks', 'list'] },
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  data: page.data.map((task) => (task.id === updated.id ? updated : task)),
                })),
              }
            : old,
      );
      toast.success(variables.successMessage ?? 'Task updated');
    },
    onError: (error, _variables, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error('Update failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
    },
  });
}
