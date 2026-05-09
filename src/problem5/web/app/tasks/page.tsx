import { Suspense } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { TasksView } from './tasks-view';

// Server component shell. The interactive surface (filters, table, dialog)
// lives in `tasks-view.tsx` so this file stays pure render and the client
// boundary is explicit. The "+ New task" affordance still hangs off the
// header — Phase 7 wires it to the form dialog.

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

      {/* useSearchParams must be inside Suspense in the App Router. */}
      <Suspense fallback={null}>
        <TasksView />
      </Suspense>
    </main>
  );
}
