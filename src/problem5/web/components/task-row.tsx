import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TaskStatusBadge } from './task-status-badge';
import { TaskPriorityBadge } from './task-priority-badge';
import { formatDate } from '@/lib/format-date';
import type { Task } from '@/schemas/task';

// Single row. Status + priority are display-only here; the inline status
// dropdown wires up `useUpdateTask` in Phase 7. The "⋮" menu is rendered but
// items are placeholder until then — keeping the layout final so Phase 7
// doesn't have to chase a moving target.

type TaskRowProps = {
  task: Task;
};

export function TaskRow({ task }: TaskRowProps) {
  return (
    <tr className="border-border/40 hover:bg-muted/40 border-b transition-colors">
      <td className="px-4 py-3 align-top">
        <div className="flex flex-col gap-1">
          <span className="font-medium leading-tight">{task.title}</span>
          {task.description ? (
            <span className="text-muted-foreground line-clamp-1 text-xs">
              {task.description}
            </span>
          ) : null}
          {task.tags.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {task.tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[11px]"
                >
                  {t}
                </span>
              ))}
              {task.tags.length > 4 ? (
                <span className="text-muted-foreground text-[11px]">
                  +{task.tags.length - 4}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <TaskStatusBadge status={task.status} />
      </td>
      <td className="px-4 py-3 align-top">
        <TaskPriorityBadge priority={task.priority} />
      </td>
      <td className="text-muted-foreground px-4 py-3 align-top text-sm tabular-nums">
        {formatDate(task.dueDate)}
      </td>
      <td className="px-4 py-3 text-right align-top">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Open actions for ${task.title}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>Edit (Phase 7)</DropdownMenuItem>
            <DropdownMenuItem disabled className="text-destructive">
              Delete (Phase 7)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
