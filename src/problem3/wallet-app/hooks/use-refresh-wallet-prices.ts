'use client';

import { useCallback, useState } from 'react';

import { BASE_PRICES } from '../data/mock-wallet';

export function useRefreshWalletPrices() {
  const [refreshing, setRefreshing] = useState(false);

  // Initialize with BASE_PRICES so server and client render identical HTML.
  // Math.random() is only called after the user clicks "Refresh" (client-only).
  const [prices, setPrices] = useState<Record<string, number>>(BASE_PRICES);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      // Safe to call Math.random() here — this only runs on the client, never during SSR.
      setPrices(
        Object.fromEntries(
          Object.entries(BASE_PRICES).map(([k, v]) => [
            k,
            v * (1 + (Math.random() - 0.5) * 0.02),
          ]),
        ),
      );
      setRefreshing(false);
    }, 300);
  }, []);

  return { prices, refreshing, handleRefresh };
}
