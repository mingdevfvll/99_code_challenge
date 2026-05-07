'use client';

import { useMemo, useState } from 'react';

import { HiddenAssetsNote } from '../components/hidden-assets-note';
import { PortfolioTotal } from '../components/portfolio-total';
import { RefreshPricesButton } from '../components/refresh-prices-button';
import { WalletBalanceList } from '../components/wallet-balance-list';
import { Header } from '../components/header';
import { BASE_PRICES, MOCK_BALANCES } from '../data/mock-wallet';
import { getPriority } from '../lib/get-priority';
import type { FormattedWalletBalance } from '../types/wallet';
import BgDarkVeil from '../components/BgDarkVeil';

export default function WalletPage() {
  const [refreshing, setRefreshing] = useState(false);

  // Initialize with BASE_PRICES so server and client render identical HTML.
  // Math.random() is only called after the user clicks "Refresh" (client-only).
  const [prices, setPrices] = useState<Record<string, number>>(BASE_PRICES);

  // Filter: only valid-priority chains with positive balances.
  // Sort: descending by chain priority (Osmosis first, Neo/Zilliqa last).
  // MOCK_BALANCES is a module-level constant — no dependency needed.
  const sortedBalances = useMemo(() => {
    return [...MOCK_BALANCES]
      .filter((b) => getPriority(b.blockchain) > -99 && b.amount > 0)
      .sort((lhs, rhs) => {
        const l = getPriority(lhs.blockchain);
        const r = getPriority(rhs.blockchain);
        if (l > r) return -1;
        if (l < r) return 1;
        return 0;
      });
  }, []);

  // Attach a human-readable fixed-decimal string to each balance.
  const formattedBalances = useMemo<FormattedWalletBalance[]>(
    () => sortedBalances.map((b) => ({ ...b, formatted: b.amount.toFixed(4) })),
    [sortedBalances],
  );

  const totalUSD = useMemo(
    () => formattedBalances.reduce((sum, b) => sum + (prices[b.currency] ?? 0) * b.amount, 0),
    [formattedBalances, prices],
  );

  const uniqueChains = new Set(formattedBalances.map((b) => b.blockchain)).size;
  const hiddenCount = MOCK_BALANCES.length - formattedBalances.length;

  function handleRefresh() {
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
  }

  return (
    <main className="min-h-screen bg-[#000000] text-white flex flex-col items-center relative">
      <div className="relative z-10 w-full max-w-sm space-y-3  py-16 px-4">

        <Header />

        <PortfolioTotal
          totalUsdValue={totalUSD}
          assetCount={formattedBalances.length}
          chainCount={uniqueChains}
        />

        <WalletBalanceList balances={formattedBalances} prices={prices} />
        <RefreshPricesButton isRefreshing={refreshing} onRefresh={handleRefresh} />
        <HiddenAssetsNote hiddenCount={hiddenCount} />

      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[clamp(17rem,52vh,37.5rem)] w-full">
        <BgDarkVeil
          hueShift={0}
          noiseIntensity={0.07}
          scanlineIntensity={0}
          speed={0.5}
          scanlineFrequency={0}
          warpAmount={0}
        />
      </div>
    </main>
  );
}
