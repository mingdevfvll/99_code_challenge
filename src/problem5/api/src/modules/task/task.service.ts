import type { Task as PrismaTask } from '@prisma/client';
import { cache } from '../../core/lib/cache.js';
import { NotFoundError } from '../../core/errors/http-errors.js';
import { taskRepository } from './task.repository.js';
import { itemCacheKey, listCacheKey, LIST_KEY_PREFIX } from './task.cache-key.js';
import type {
  CreateTaskInput,
  ListTaskQuery,
  UpdateTaskInput,
} from './task.schema.js';

const LIST_TTL = 30;
const ITEM_TTL = 60;

// Service layer = business rules + cache. Never imports Prisma directly.
// Mutations invalidate before returning so a subsequent read in the same
// process sees the write.

export const taskService = {
  async create(input: CreateTaskInput): Promise<PrismaTask> {
    const created = await taskRepository.create(input);
    await cache.invalidatePrefix(LIST_KEY_PREFIX);
    return created;
  },

  async list(filters: ListTaskQuery): Promise<{ tasks: PrismaTask[]; nextCursor: string | null }> {
    const key = listCacheKey(filters);
    return cache.getOrSet(key, LIST_TTL, () => taskRepository.findMany(filters));
  },

  async getById(id: string): Promise<PrismaTask> {
    const key = itemCacheKey(id);
    const found = await cache.getOrSet(key, ITEM_TTL, () => taskRepository.findById(id));
    if (!found) throw new NotFoundError('Task not found');
    return found;
  },

  async update(id: string, input: UpdateTaskInput): Promise<PrismaTask> {
    const updated = await taskRepository.update(id, input);
    if (!updated) throw new NotFoundError('Task not found');
    await Promise.all([
      cache.invalidate(itemCacheKey(id)),
      cache.invalidatePrefix(LIST_KEY_PREFIX),
    ]);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const ok = await taskRepository.delete(id);
    if (!ok) throw new NotFoundError('Task not found');
    await Promise.all([
      cache.invalidate(itemCacheKey(id)),
      cache.invalidatePrefix(LIST_KEY_PREFIX),
    ]);
  },
};
