import { z } from 'zod';
import { TaskStatus, TaskPriority } from '@prisma/client';

// Single source of truth for Task shapes. The repository, service, and
// controller infer their types from these. The OpenAPI generator (Phase 4)
// also reads them. Drift is impossible because there's nothing to drift from.

export const taskStatusEnum = z.nativeEnum(TaskStatus);
export const taskPriorityEnum = z.nativeEnum(TaskPriority);

const isoDateTime = z
  .string()
  .datetime({ offset: true, message: 'Must be ISO 8601 datetime' });

const tagSchema = z
  .string()
  .min(1, 'Tag must not be empty')
  .max(50, 'Tag at most 50 chars')
  .transform((s) => s.trim().toLowerCase());

const tagsSchema = z
  .array(tagSchema)
  .max(20, 'At most 20 tags')
  .transform((arr) => Array.from(new Set(arr)));

// ---------- Domain shape ---------- //

export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  status: taskStatusEnum,
  priority: taskPriorityEnum,
  dueDate: z.date().nullable(),
  tags: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Task = z.infer<typeof taskSchema>;

// ---------- Create ---------- //

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1, 'Title required').max(200),
    description: z.string().nullable().optional(),
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
    dueDate: isoDateTime.nullable().optional(),
    tags: tagsSchema.optional(),
  })
  .strict();
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// ---------- Update ---------- //

export const updateTaskSchema = createTaskSchema
  .partial()
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field required for update',
  });
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// ---------- List query ---------- //

const ALLOWED_SORT_FIELDS = ['createdAt', 'dueDate', 'priority', 'title'] as const;
type SortField = (typeof ALLOWED_SORT_FIELDS)[number];

const sortSchema = z
  .string()
  .transform((s) => s.split(',').map((p) => p.trim()).filter(Boolean))
  .pipe(
    z.array(
      z.string().refine(
        (token) => {
          const field = token.startsWith('-') ? token.slice(1) : token;
          return (ALLOWED_SORT_FIELDS as readonly string[]).includes(field);
        },
        { message: `Sort token must be one of: ${ALLOWED_SORT_FIELDS.join(', ')} (prefix '-' for desc)` },
      ),
    ),
  )
  .transform((tokens): Array<{ field: SortField; direction: 'asc' | 'desc' }> =>
    tokens.map((t) => {
      const desc = t.startsWith('-');
      const field = (desc ? t.slice(1) : t) as SortField;
      return { field, direction: desc ? 'desc' : 'asc' };
    }),
  );

// Multi-value query params arrive as `string | string[]` from Express. Coerce
// to a normalized array so the repo doesn't need to know about Express quirks.
const multiEnum = <T extends z.ZodTypeAny>(item: T) =>
  z
    .union([item, z.array(item)])
    .optional()
    .transform((v): z.infer<T>[] | undefined =>
      v === undefined ? undefined : Array.isArray(v) ? v : [v],
    );

export const listTaskQuerySchema = z
  .object({
    status: multiEnum(taskStatusEnum),
    priority: multiEnum(taskPriorityEnum),
    q: z.string().trim().min(1).max(200).optional(),
    dueBefore: isoDateTime.optional(),
    dueAfter: isoDateTime.optional(),
    tags: z
      .string()
      .optional()
      .transform((s) =>
        s
          ? s
              .split(',')
              .map((t) => t.trim().toLowerCase())
              .filter(Boolean)
          : undefined,
      ),
    sort: sortSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().min(1).optional(),
  })
  .strict();
export type ListTaskQuery = z.infer<typeof listTaskQuerySchema>;

// ---------- Path params ---------- //

export const taskIdParamSchema = z
  .object({
    id: z
      .string()
      .min(1)
      // cuid roughly: starts with c, 25 chars total, alnum lowercase
      .regex(/^c[a-z0-9]{20,30}$/i, { message: 'Invalid task id' }),
  })
  .strict();
export type TaskIdParam = z.infer<typeof taskIdParamSchema>;
