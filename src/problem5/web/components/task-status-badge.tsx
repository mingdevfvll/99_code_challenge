import { Circle, CircleCheck, CirclePause, CircleDot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/schemas/task';

// Status presentation map — color + icon. Color is paired with an icon so
// red/green color blindness doesn't strip the signal (`docs/05` a11y note).

const STATUS_META: Record<TaskStatus, { label: string; icon: React.ComponentType<{ className?: string }>; classes: string }> = {
  TODO: {
    label: 'To do',
    icon: Circle,
    classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200 border-slate-300/50 dark:border-slate-700',
  },
  IN_PROGRESS: {
    label: 'In progress',
    icon: CircleDot,
    classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 border-blue-300/60 dark:border-blue-700',
  },
  DONE: {
    label: 'Done',
    icon: CircleCheck,
    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-300/60 dark:border-emerald-700',
  },
  ARCHIVED: {
    label: 'Archived',
    icon: CirclePause,
    classes: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400 border-zinc-300/50 dark:border-zinc-700 line-through opacity-80',
  },
};

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge
      variant="outline"
      aria-label={`Status: ${meta.label}`}
      title={meta.label}
      className={cn('gap-1.5 font-medium border', meta.classes, className)}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
