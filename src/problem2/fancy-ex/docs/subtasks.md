deduplicatePrices Brief. 
Additional info for the logic.
- Related to TASK 4: usePrices — fetch, deduplicate, filter, sort

```
import { useQuery } from '@tanstack/react-query';
import type { Token, TokenPrice } from '../types';

const PRICES_URL = 'https://interview.switcheo.com/prices.json';

/**
 * Deduplication rules (derived from real data analysis):
 *
 * 1. Same currency, different dates  → keep the entry with the latest date
 * 2. Same currency, same date        → keep the last occurrence in the array
 *    (BUSD and USDC in real data have this case)
 * 3. Price <= 0 or missing           → discard
 *
 * Strategy: reduce into a Map<currency, TokenPrice>.
 * For each entry, overwrite the map value if:
 *   - No existing entry yet, OR
 *   - Incoming date is strictly newer, OR
 *   - Incoming date is equal (last-one-wins for same-date duplicates)
 */
function deduplicatePrices(raw: TokenPrice[]): TokenPrice[] {
  const map = new Map<string, TokenPrice>();

  for (const entry of raw) {
    // Discard invalid prices
    if (!entry.price || entry.price <= 0) continue;

    const existing = map.get(entry.currency);

    if (!existing) {
      map.set(entry.currency, entry);
      continue;
    }

    const incomingDate = new Date(entry.date).getTime();
    const existingDate = new Date(existing.date).getTime();

    // Keep incoming if date is same or newer (last-one-wins on tie)
    if (incomingDate >= existingDate) {
      map.set(entry.currency, entry);
    }
  }

  return Array.from(map.values());
}

/**
 * Maps a deduplicated TokenPrice to the Token shape used by the UI.
 * Icon path convention: /images/{SYMBOL}.svg
 * Falls back gracefully in TokenSelector if the file does not exist.
 */
function mapToToken(entry: TokenPrice): Token {
  return {
    symbol: entry.currency,
    price: entry.price,
    icon: `/images/${entry.currency}.svg`,
  };
}

async function fetchPrices(): Promise<Token[]> {
  const res = await fetch(PRICES_URL);

  if (!res.ok) {
    throw new Error(`Failed to fetch prices: ${res.status} ${res.statusText}`);
  }

  const raw: TokenPrice[] = await res.json();

  return deduplicatePrices(raw)
    .map(mapToToken)
    .sort((a, b) => a.symbol.localeCompare(b.symbol)); // alphabetical
}

export function usePrices() {
  const { data, isLoading, isError, refetch } = useQuery<Token[]>({
    queryKey: ['prices'],
    queryFn: fetchPrices,
    staleTime: 60_000,         // treat data as fresh for 1 minute
    refetchOnWindowFocus: false,
  });

  return {
    tokens: data ?? [],
    isLoading,
    isError,
    refetch,
  };
}
```