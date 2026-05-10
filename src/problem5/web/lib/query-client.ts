import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

// Single QueryClient factory. Defaults are tuned for this app:
//   - staleTime 30s matches the API's list cache TTL (see
//     `docs/06-observability.md`). Refetching inside that window is wasted.
//   - retry: 1, but only on network-shaped errors. 4xx never retries — that
//     would just send the same bad request twice.
//   - refetchOnWindowFocus off. The dataset is small and user-driven; tab
//     focus isn't a meaningful trigger.

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, err) => {
          if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
            return false;
          }
          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
