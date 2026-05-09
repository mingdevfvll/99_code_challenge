// Vanilla landing page — replaced in Phase 5 once the providers and the
// /tasks shell land. Kept minimal so this commit isolates the Next + shadcn
// bootstrap from the app-specific wiring.

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">
        Bootstrap placeholder. App router lights up in the next commit.
      </p>
    </main>
  );
}
