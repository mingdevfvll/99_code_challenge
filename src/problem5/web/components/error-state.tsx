import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';

// Inline error card. Same visual weight as the empty state so a swap between
// the two doesn't reflow the surrounding layout.

type ErrorStateProps = {
  error: unknown;
  onRetry?: () => void;
};

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { title, body, requestId } = describe(error);

  return (
    <div
      role="alert"
      className="border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 rounded-lg border px-6 py-12 text-center"
    >
      <div className="bg-destructive/10 text-destructive rounded-full p-3">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-medium">{title}</h3>
      <p className="text-muted-foreground max-w-md text-sm">{body}</p>
      {requestId ? (
        <p className="text-muted-foreground/80 font-mono text-xs">
          Request id: {requestId}
        </p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

function describe(error: unknown): { title: string; body: string; requestId?: string } {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.code === 'NETWORK_ERROR') {
      return {
        title: "Couldn't reach the API",
        body: 'The server didn\'t answer. Make sure the API is running on the configured URL.',
        requestId: error.requestId,
      };
    }
    return {
      title: error.status >= 500 ? 'Server error' : 'Request failed',
      body: error.message || 'The API responded with an error.',
      requestId: error.requestId,
    };
  }
  if (error instanceof Error) {
    return { title: 'Something went wrong', body: error.message };
  }
  return { title: 'Something went wrong', body: 'Unknown error.' };
}
