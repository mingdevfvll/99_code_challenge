import { Suspense } from 'react';
import { TasksView } from './tasks-view';

// Server component shell. The interactive surface (header actions, filters,
// table, dialogs) lives in `tasks-view.tsx` so the client boundary is explicit.

export default function TasksPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* useSearchParams must be inside Suspense in the App Router. */}
      <Suspense fallback={null}>
        <TasksView />
      </Suspense>
    </main>
  );
}
