import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskPriorityBadge } from './task-priority-badge';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { taskStatusEnum, type Task, type TaskStatus } from '@/schemas/task';

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  ARCHIVED: 'Archived',
};

type TaskRowProps = {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
};

export function TaskRow({ task, onEdit, onDelete, onStatusChange }: TaskRowProps) {
  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.16 }}
      className="border-border/40 hover:bg-muted/40 border-b transition-colors"
    >
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
        <StatusMenu task={task} onStatusChange={onStatusChange} />
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
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(task)}>
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  );
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskRowProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.16 }}
      className="border-border/60 bg-card rounded-lg border p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium leading-tight">{task.title}</h3>
          {task.description ? (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {task.description}
            </p>
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label={`Open actions for ${task.title}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(task)}>
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusMenu task={task} onStatusChange={onStatusChange} />
        <TaskPriorityBadge priority={task.priority} />
        <span className="text-muted-foreground text-xs tabular-nums">
          Due {formatDate(task.dueDate)}
        </span>
      </div>

      {task.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[11px]"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </motion.article>
  );
}

function StatusMenu({
  task,
  onStatusChange,
}: {
  task: Task;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}) {
  return (
    <Select
      value={task.status}
      onValueChange={(value) => onStatusChange(task, value as TaskStatus)}
      items={taskStatusEnum.options.map((status) => ({ value: status, label: STATUS_LABELS[status] }))}
    >
      <SelectTrigger
        size="sm"
        aria-label={`Change status for ${task.title}`}
        className={cn(
          'h-7 rounded-full border px-2.5 text-xs font-medium shadow-none [&_[data-slot=select-value]]:gap-1.5',
          task.status === 'TODO' && 'border-slate-300/60 bg-slate-100/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
          task.status === 'IN_PROGRESS' && 'border-blue-300/70 bg-blue-100/80 text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
          task.status === 'DONE' && 'border-emerald-300/70 bg-emerald-100/80 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
          task.status === 'ARCHIVED' && 'border-zinc-300/60 bg-zinc-100/80 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400',
        )}
      >
        <SelectValue>
          {(value) => (
            <>
              <StatusDot status={(value ?? task.status) as TaskStatus} />
              {STATUS_LABELS[(value ?? task.status) as TaskStatus]}
            </>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="w-44 p-1.5">
        {taskStatusEnum.options.map((status) => (
          <SelectItem key={status} value={status} className="py-1.5">
            <StatusDot status={status} />
            <span>{STATUS_LABELS[status]}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StatusDot({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        'h-1.5 w-1.5 rounded-full',
        status === 'TODO' && 'bg-slate-400',
        status === 'IN_PROGRESS' && 'bg-blue-500',
        status === 'DONE' && 'bg-emerald-500',
        status === 'ARCHIVED' && 'bg-zinc-400',
      )}
      aria-hidden="true"
    />
  );
}
