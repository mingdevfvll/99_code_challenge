'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  taskPriorityEnum,
  taskStatusEnum,
  type CreateTaskInput,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type UpdateTaskInput,
} from '@/schemas/task';

const formSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().max(2000, 'Description is too long').optional(),
  status: taskStatusEnum,
  priority: taskPriorityEnum,
  dueDate: z.string().optional(),
  tags: z.array(z.string()).max(20),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  task: Task | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateTaskInput | UpdateTaskInput) => Promise<void>;
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  ARCHIVED: 'Archived',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function dateInputToIso(value: string | undefined): string | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00.000`).toISOString();
}

function taskToValues(task: Task | null): FormValues {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'TODO',
    priority: task?.priority ?? 'MEDIUM',
    dueDate: dateInputValue(task?.dueDate),
    tags: task?.tags ?? [],
  };
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
  ).slice(0, 20);
}

export function TaskFormDialog({
  open,
  mode,
  task,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: Props) {
  const values = React.useMemo(() => taskToValues(task), [task]);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values,
  });

  async function submit(values: FormValues) {
    const input: CreateTaskInput | UpdateTaskInput = {
      title: values.title.trim(),
      description: values.description?.trim() ? values.description.trim() : null,
      status: values.status,
      priority: values.priority,
      dueDate: dateInputToIso(values.dueDate),
      tags: normalizeTags(values.tags),
    };

    try {
      await onSubmit(input);
      onOpenChange(false);
    } catch {
      // Mutation hook owns toast + rollback. Keep dialog open for correction.
    }
  }

  const titleId = mode === 'create' ? 'Create task' : 'Edit task';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titleId}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a task to the current list.' : 'Update task details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(submit)} className="grid gap-4">
          <Field error={form.formState.errors.title?.message}>
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              autoFocus
              aria-invalid={Boolean(form.formState.errors.title)}
              {...form.register('title')}
            />
          </Field>

          <Field error={form.formState.errors.description?.message}>
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              rows={4}
              aria-invalid={Boolean(form.formState.errors.description)}
              {...form.register('description')}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <Label htmlFor="task-status">Status</Label>
              <NativeSelect id="task-status" {...form.register('status')}>
                {taskStatusEnum.options.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <Label htmlFor="task-priority">Priority</Label>
              <NativeSelect id="task-priority" {...form.register('priority')}>
                {taskPriorityEnum.options.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <Label htmlFor="task-due-date">Due date</Label>
              <Input id="task-due-date" type="date" {...form.register('dueDate')} />
            </Field>
          </div>

          <Controller
            control={form.control}
            name="tags"
            render={({ field }) => (
              <TagInput tags={field.value} onChange={field.onChange} />
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || form.formState.isSubmitting}>
              {mode === 'create' ? 'Create task' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  children,
  error,
}: {
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="grid gap-2">
      {children}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

function NativeSelect({
  className,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'border-input bg-background h-8 w-full rounded-lg border px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30',
        className,
      )}
      {...props}
    />
  );
}

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = React.useState('');

  function commit(raw: string) {
    const next = normalizeTags([...tags, raw]);
    onChange(next);
    setDraft('');
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="task-tags">Tags</Label>
      <div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex min-h-8 flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1 transition-colors focus-within:ring-3 dark:bg-input/30">
        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px]"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((item) => item !== tag))}
              className="rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id="task-tags"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (draft.trim()) commit(draft);
          }}
          onKeyDown={(event) => {
            if (event.key === ',' || event.key === 'Enter') {
              event.preventDefault();
              if (draft.trim()) commit(draft);
            }
            if (event.key === 'Backspace' && !draft && tags.length > 0) {
              onChange(tags.slice(0, -1));
            }
          }}
          placeholder={tags.length ? '' : 'Add tags'}
          className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <p className="text-muted-foreground text-xs">Press comma or Enter to add a tag.</p>
    </div>
  );
}
