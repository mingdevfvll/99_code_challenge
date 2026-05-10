import { z } from 'zod';

// Mirrors `api/src/modules/task/task.schema.ts`. Duplicated on purpose, see
// `docs/11-decisions.md` ("Schema duplication"). The two only need to drift
// at deploy time; runtime safety comes from the API contract, not from a
// shared type.

export const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED']);
export const taskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export type TaskStatus = z.infer<typeof taskStatusEnum>;
export type TaskPriority = z.infer<typeof taskPriorityEnum>;

// API returns dates as ISO 8601 strings. We keep them as strings client-side
// and only parse to Date when a component actually needs to format/compare.
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusEnum,
  priority: taskPriorityEnum,
  dueDate: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Task = z.infer<typeof taskSchema>;

export const taskListResponseSchema = z.object({
  data: z.array(taskSchema),
  pagination: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});
export type TaskListResponse = z.infer<typeof taskListResponseSchema>;

export const taskItemResponseSchema = z.object({ data: taskSchema });
export type TaskItemResponse = z.infer<typeof taskItemResponseSchema>;

// ---------- Filters (URL-driven) ---------- //

export const taskSortOptions = [
  { value: '-createdAt', label: 'Newest' },
  { value: 'createdAt', label: 'Oldest' },
  { value: 'dueDate', label: 'Due soon' },
  { value: '-dueDate', label: 'Due latest' },
  { value: '-priority', label: 'Priority high → low' },
  { value: 'priority', label: 'Priority low → high' },
  { value: 'title', label: 'Title A → Z' },
  { value: '-title', label: 'Title Z → A' },
] as const;

export type TaskSort = (typeof taskSortOptions)[number]['value'];

export type TaskFilters = {
  q?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  dueBefore?: string;
  dueAfter?: string;
  tags?: string[];
  sort?: TaskSort;
};

// ---------- Mutation inputs ---------- //

export const createTaskInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().nullable().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  dueDate: z.string().nullable().optional(),
  tags: z.array(z.string()).max(20).optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = createTaskInputSchema.partial();
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;
