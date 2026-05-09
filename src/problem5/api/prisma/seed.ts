import { PrismaClient, TaskPriority, TaskStatus } from '@prisma/client';

// Idempotent seed. Stable titles act as natural keys for upsert. Re-running
// `npm run db:seed` does not duplicate rows.
//
// Coverage target: every status × every priority appears at least once. Mix
// of due dates (past, soon, far, null), mix of tag arrays.

const prisma = new PrismaClient();

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const days = (n: number) => new Date(NOW + n * DAY);

const seedTasks = [
  {
    title: 'Send invoice to Acme',
    description: 'Net 30, attach W-9 and prior month statement.',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    dueDate: days(7),
    tags: ['billing', 'client'],
  },
  {
    title: 'Review PR #482',
    description: 'Pagination refactor. Check the cursor encoding.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    dueDate: days(2),
    tags: ['code-review'],
  },
  {
    title: 'Fix typo in landing page hero',
    description: null,
    status: TaskStatus.DONE,
    priority: TaskPriority.LOW,
    dueDate: null,
    tags: ['marketing'],
  },
  {
    title: 'Migrate analytics dashboard to v2',
    description: 'Cut over Tuesday window. Notify customer success.',
    status: TaskStatus.TODO,
    priority: TaskPriority.URGENT,
    dueDate: days(3),
    tags: ['platform', 'analytics'],
  },
  {
    title: 'Archive Q1 product roadmap doc',
    description: 'Superseded by Q2 plan.',
    status: TaskStatus.ARCHIVED,
    priority: TaskPriority.LOW,
    dueDate: days(-30),
    tags: ['docs'],
  },
  {
    title: 'Investigate spike in 500s on checkout',
    description: 'Started ~14:00 UTC. Logs show ECONNREFUSED to inventory.',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.URGENT,
    dueDate: days(1),
    tags: ['incident', 'platform'],
  },
  {
    title: 'Schedule one-on-ones for next month',
    description: null,
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: days(14),
    tags: ['team'],
  },
  {
    title: 'Write retro for Project Hailstone',
    description: 'Cover what we cut and why. 2 pages max.',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: days(10),
    tags: ['docs', 'retro'],
  },
  {
    title: 'Decommission legacy webhook receiver',
    description: 'Two consumers remain — coordinate sunset.',
    status: TaskStatus.DONE,
    priority: TaskPriority.HIGH,
    dueDate: days(-7),
    tags: ['platform', 'cleanup'],
  },
  {
    title: 'Update onboarding checklist for new hires',
    description: 'Add the new auth provider step.',
    status: TaskStatus.ARCHIVED,
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    tags: ['docs', 'team'],
  },
];

async function main() {
  console.log(`[seed] Upserting ${seedTasks.length} tasks…`);

  for (const t of seedTasks) {
    // Title isn't unique in the schema; do find-then-create/update so the
    // operation is idempotent. Plenty fast for a 10-row seed.
    const existing = await prisma.task.findFirst({ where: { title: t.title } });
    if (existing) {
      await prisma.task.update({ where: { id: existing.id }, data: t });
    } else {
      await prisma.task.create({ data: t });
    }
  }

  const total = await prisma.task.count();
  console.log(`[seed] Done. Task count: ${total}.`);
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
