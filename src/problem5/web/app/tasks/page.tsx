import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';

// Phase 5 shell. The header + theme toggle + "+ New task" affordance are in
// place; the table, filters, and dialogs land in Phase 6/7. Keeping this as
// a server component for now — the interactive parts (toggle, button) are
// already client-bounded.

export default function TasksPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground text-sm">
            Track work across status, priority, and due date.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button disabled aria-disabled className="gap-1.5">
            <Plus className="h-4 w-4" />
            New task
          </Button>
        </div>
      </header>

      <Separator />

      <section
        aria-label="Task list"
        className="border-border/60 bg-card/40 flex flex-1 items-center justify-center rounded-lg border border-dashed p-12"
      >
        <p className="text-muted-foreground text-sm">
          The task table arrives in Phase 6. The skeleton page renders so the
          providers, theme toggle, and layout can be verified end-to-end.
        </p>
      </section>
    </main>
  );
}
