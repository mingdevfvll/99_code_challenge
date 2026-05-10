import { apiClient } from '../api-client';
import type {
  CreateTaskInput,
  Task,
  TaskFilters,
  TaskItemResponse,
  TaskListResponse,
  UpdateTaskInput,
} from '@/schemas/task';

// Resource layer for the Task endpoint. The transport (`api-client.ts`) knows
// nothing about Task; this file builds the query, picks endpoints, and unpacks
// the `{ data: ... }` envelope so callers see plain values.

const BASE = '/api/v1/tasks';

type ListArgs = {
  filters?: TaskFilters;
  cursor?: string | null;
  limit?: number;
};

function filtersToQuery(filters: TaskFilters | undefined, extra: { cursor?: string; limit?: number }) {
  const q: Record<string, string | string[] | number | boolean | undefined> = {};
  if (!filters) return { ...q, ...stripUndefined(extra) };

  if (filters.q) q.q = filters.q;
  if (filters.status?.length) q.status = filters.status;
  if (filters.priority?.length) q.priority = filters.priority;
  if (filters.dueBefore) q.dueBefore = filters.dueBefore;
  if (filters.dueAfter) q.dueAfter = filters.dueAfter;
  // Backend takes tags as a comma-separated string (single param, repository
  // splits it). Matches `task.schema.ts` listTaskQuerySchema.
  if (filters.tags?.length) q.tags = filters.tags.join(',');
  if (filters.sort) q.sort = filters.sort;

  return { ...q, ...stripUndefined(extra) };
}

function stripUndefined<T extends Record<string, unknown>>(o: T): T {
  const out = {} as T;
  for (const k in o) if (o[k] !== undefined && o[k] !== null) out[k] = o[k];
  return out;
}

export const tasksApi = {
  async list({ filters, cursor, limit }: ListArgs = {}): Promise<TaskListResponse> {
    const extra: { cursor?: string; limit?: number } = {};
    if (cursor != null) extra.cursor = cursor;
    if (limit !== undefined) extra.limit = limit;
    return apiClient.get<TaskListResponse>(BASE, {
      query: filtersToQuery(filters, extra),
    });
  },

  async getById(id: string): Promise<Task> {
    const res = await apiClient.get<TaskItemResponse>(`${BASE}/${id}`);
    return res.data;
  },

  async create(input: CreateTaskInput): Promise<Task> {
    const res = await apiClient.post<TaskItemResponse>(BASE, input);
    return res.data;
  },

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const res = await apiClient.patch<TaskItemResponse>(`${BASE}/${id}`, input);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete<void>(`${BASE}/${id}`);
  },
};
