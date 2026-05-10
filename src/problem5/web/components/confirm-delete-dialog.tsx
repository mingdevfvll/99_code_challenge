'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Task } from '@/schemas/task';

type Props = {
  open: boolean;
  task: Task | null;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
};

export function ConfirmDeleteDialog({
  open,
  task,
  isDeleting,
  onOpenChange,
  onConfirm,
}: Props) {
  async function confirm() {
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Mutation hook owns toast + rollback. Keep dialog open.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete task</DialogTitle>
          <DialogDescription>
            {task ? `Delete "${task.title}"? This removes it from the list.` : 'Delete this task?'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={confirm} disabled={isDeleting || !task}>
            Delete task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
