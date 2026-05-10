'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksApi } from '@/lib/api/tasks';
import type { TaskListResponse } from '@/schemas/task';

type Snapshot = Array<readonly [readonly unknown[], InfiniteData<TaskListResponse> | undefined]>;

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onMutate: async (id) => {
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
                  data: page.data.filter((task) => task.id !== id),
                })),
              }
            : old,
      );

      return { previous };
    },
    onSuccess: () => {
      toast.success('Task deleted');
    },
    onError: (error, _id, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error('Delete failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
    },
  });
}
