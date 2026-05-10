'use client';

import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api/tasks';

export const taskQueryKey = (id: string | null | undefined) => ['tasks', 'detail', id] as const;

export function useTaskQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: taskQueryKey(id),
    queryFn: () => tasksApi.getById(id as string),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
