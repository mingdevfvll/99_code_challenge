import type { Prisma, Task as PrismaTask } from '@prisma/client';
import { prisma } from '../../core/lib/prisma.js';
import type {
  CreateTaskInput,
  ListTaskQuery,
  UpdateTaskInput,
} from './task.schema.js';

// The only file in the codebase that imports `prisma` directly. Service +
// controller layers go through this surface.
//
// findMany handles the filter→where translation and cursor encoding. Default
// sort is (createdAt desc, id desc). Custom sorts use offset (= no cursor),
// per `docs/11-decisions.md`.

export const taskRepository = {
  async create(input: CreateTaskInput): Promise<PrismaTask> {
    return prisma.task.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? undefined,
        priority: input.priority ?? undefined,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        tags: input.tags ?? [],
      },
    });
  },

  async findById(id: string): Promise<PrismaTask | null> {
    return prisma.task.findUnique({ where: { id } });
  },

  async update(id: string, input: UpdateTaskInput): Promise<PrismaTask | null> {
    const data: Prisma.TaskUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.dueDate !== undefined) {
      data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }
    if (input.tags !== undefined) data.tags = input.tags;

    try {
      return await prisma.task.update({ where: { id }, data });
    } catch (err) {
      if (isPrismaNotFound(err)) return null;
      throw err;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.task.delete({ where: { id } });
      return true;
    } catch (err) {
      if (isPrismaNotFound(err)) return false;
      throw err;
    }
  },

  async findMany(filters: ListTaskQuery): Promise<{ tasks: PrismaTask[]; nextCursor: string | null }> {
    const where = buildWhere(filters);
    const customSort = filters.sort && filters.sort.length > 0;

    if (customSort) {
      // Cursor pagination is reserved for the default sort. Custom sorts use
      // offset via `take + skip`, documented in `docs/11-decisions.md`.
      const orderBy = filters.sort!.map((s) => ({ [s.field]: s.direction }));
      // Append id tiebreaker so order is total.
      orderBy.push({ id: 'desc' });

      const tasks = await prisma.task.findMany({
        where,
        orderBy,
        take: filters.limit + 1,
        skip: filters.cursor ? Number.parseInt(filters.cursor, 10) || 0 : 0,
      });
      const hasMore = tasks.length > filters.limit;
      const slice = hasMore ? tasks.slice(0, filters.limit) : tasks;
      const nextOffset = hasMore
        ? (filters.cursor ? Number.parseInt(filters.cursor, 10) || 0 : 0) + filters.limit
        : null;
      return { tasks: slice, nextCursor: nextOffset === null ? null : String(nextOffset) };
    }

    // Default sort path: cursor on (createdAt desc, id desc). The cursor IS
    // the last row's id; we use Prisma's `cursor + skip: 1` semantics so the
    // pagination works on a single index without composite cursor encoding.
    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: filters.limit + 1,
      ...(filters.cursor
        ? { cursor: { id: filters.cursor }, skip: 1 }
        : {}),
    });

    const hasMore = tasks.length > filters.limit;
    const slice = hasMore ? tasks.slice(0, filters.limit) : tasks;
    const last = slice[slice.length - 1];
    return {
      tasks: slice,
      nextCursor: hasMore && last ? last.id : null,
    };
  },
};

function buildWhere(filters: ListTaskQuery): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};

  if (filters.status && filters.status.length > 0) {
    where.status = { in: filters.status };
  }
  if (filters.priority && filters.priority.length > 0) {
    where.priority = { in: filters.priority };
  }
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: 'insensitive' } },
      { description: { contains: filters.q, mode: 'insensitive' } },
    ];
  }
  if (filters.dueAfter || filters.dueBefore) {
    where.dueDate = {
      ...(filters.dueAfter ? { gte: new Date(filters.dueAfter) } : {}),
      ...(filters.dueBefore ? { lte: new Date(filters.dueBefore) } : {}),
    };
  }
  if (filters.tags && filters.tags.length > 0) {
    // Postgres `text[] && text[]` = "any element overlaps". Hits the GIN index.
    where.tags = { hasSome: filters.tags };
  }

  return where;
}

function isPrismaNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2025'
  );
}
