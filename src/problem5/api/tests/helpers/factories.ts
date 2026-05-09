import { TaskPriority, TaskStatus } from '@prisma/client';
import { prisma } from '../../src/core/lib/prisma.js';

type SeedTask = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  tags?: string[];
};

export async function seedTask(overrides: SeedTask = {}) {
  return prisma.task.create({
    data: {
      title: overrides.title ?? 'Sample task',
      description: overrides.description ?? null,
      status: overrides.status ?? 'TODO',
      priority: overrides.priority ?? 'MEDIUM',
      dueDate: overrides.dueDate ?? null,
      tags: overrides.tags ?? [],
    },
  });
}

export async function seedTasks(count: number, overrides: SeedTask = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    // sequential awaits so createdAt order is deterministic — the cursor
    // pagination test depends on a stable ordering by createdAt DESC.
    out.push(
      await seedTask({
        ...overrides,
        title: overrides.title ? `${overrides.title} ${i + 1}` : `Task ${i + 1}`,
      }),
    );
    // 1 ms gap so two rows don't collide on the same millisecond timestamp.
    await new Promise((r) => setTimeout(r, 2));
  }
  return out;
}
