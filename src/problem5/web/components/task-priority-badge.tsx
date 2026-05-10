import { ArrowDown, ArrowUp, Equal, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TaskPriority } from '@/schemas/task';

const PRIORITY_META: Record<TaskPriority, { label: string; icon: React.ComponentType<{ className?: string }>; classes: string }> = {
  LOW: {
    label: 'Low',
    icon: ArrowDown,
    classes: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border-slate-300/50 dark:border-slate-700',
  },
  MEDIUM: {
    label: 'Medium',
    icon: Equal,
    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300/60 dark:border-amber-700',
  },
  HIGH: {
    label: 'High',
    icon: ArrowUp,
    classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200 border-orange-300/60 dark:border-orange-700',
  },
  URGENT: {
    label: 'Urgent',
    icon: Flame,
    classes: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200 border-rose-300/60 dark:border-rose-700',
  },
};

export function TaskPriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const meta = PRIORITY_META[priority];
  const Icon = meta.icon;
  return (
    <Badge
      variant="outline"
      aria-label={`Priority: ${meta.label}`}
      title={meta.label}
      className={cn('gap-1 font-medium border', meta.classes, className)}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
