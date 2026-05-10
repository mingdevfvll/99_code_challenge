import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { PRICES_URL } from "@/lib/apis/interview-price-api";
import type { Token, TokenPrice } from "@/types";

/** Loose row shape from the wire before filtering invalid prices */
const pricesJsonRowSchema = z.object({
  currency: z.string(),
  date: z.string(),
  price: z.union([z.number(), z.null(), z.undefined()]),
});

const pricesJsonSchema = z.array(pricesJsonRowSchema);

function parseAndFilterRows(data: unknown): TokenPrice[] {
  const parsed = pricesJsonSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Invalid prices response");
  }

  const out: TokenPrice[] = [];
  for (const row of parsed.data) {
    const { price } = row;
    if (
      price == null ||
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      continue;
    }
    out.push({
      currency: row.currency,
      date: row.date,
      price,
    });
  }
  return out;
}

function dedupeLatestByCurrency(rows: TokenPrice[]): TokenPrice[] {
  const byCurrency = new Map<string, TokenPrice>();
  for (const row of rows) {
    const existing = byCurrency.get(row.currency);
    if (!existing || row.date >= existing.date) {
      byCurrency.set(row.currency, row);
    }
  }
  return Array.from(byCurrency.values());
}

function toTokens(rows: TokenPrice[]): Token[] {
  const tokens = rows.map(
    (row): Token => ({
      symbol: row.currency,
      price: row.price,
      icon: `/images/${row.currency}.svg`,
    }),
  );
  tokens.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return tokens;
}

async function fetchPrices(): Promise<Token[]> {
  const response = await fetch(PRICES_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch prices");
  }
  const data: unknown = await response.json();
  const filtered = parseAndFilterRows(data);
  const deduped = dedupeLatestByCurrency(filtered);
  return toTokens(deduped);
}

export function usePrices(): {
  tokens: Token[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: ["prices"],
    queryFn: fetchPrices,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    tokens: query.data ?? [],
    isLoading: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
