import { ListChecks, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Two flavors share one component because the layout (icon, title, body,
// optional CTA) is identical. The branching is at the call site, not here.

type EmptyStateProps = {
  variant: 'no-tasks' | 'no-matches';
  onAction?: () => void;
};

export function EmptyState({ variant, onAction }: EmptyStateProps) {
  const Icon = variant === 'no-tasks' ? ListChecks : FilterX;
  const title = variant === 'no-tasks' ? 'No tasks yet' : 'No tasks match these filters';
  const body =
    variant === 'no-tasks'
      ? 'Create your first task to get started. The "+ New task" button is in the top right.'
      : 'Try removing a filter or clearing the search to see more results.';
  const cta = variant === 'no-matches' && onAction ? 'Clear filters' : null;

  return (
    <div
      role="status"
      className="border-border/60 bg-card/30 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center"
    >
      <div className="bg-muted text-muted-foreground rounded-full p-3">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-medium">{title}</h3>
      <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
      {cta ? (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-2">
          {cta}
        </Button>
      ) : null}
    </div>
  );
}
