'use client';

import { HiddenAssetsNote } from '../components/hidden-assets-note';
import { PortfolioTotal } from '../components/portfolio-total';
import { RefreshPricesButton } from '../components/refresh-prices-button';
import { WalletBalanceList } from '../components/wallet-balance-list';
import { Header } from '../components/header';
import BgDarkVeil from '../components/bg-dark-veil';
import { useRefreshWalletPrices } from '../hooks/use-refresh-wallet-prices';
import { useWalletPortfolio } from '../hooks/use-wallet-portfolio';

export default function WalletPage() {
  const { prices, refreshing, handleRefresh } = useRefreshWalletPrices();
  const { formattedBalances, totalUsd, uniqueChains, hiddenCount } =
    useWalletPortfolio(prices);

  return (
    <main className="min-h-screen bg-[#000000] text-white flex flex-col items-center relative">
      <div className="relative z-10 w-full max-w-sm space-y-3  py-16 px-4">

        <Header />

        <PortfolioTotal
          totalUsdValue={totalUsd}
          assetCount={formattedBalances.length}
          chainCount={uniqueChains}
        />

        <WalletBalanceList balances={formattedBalances} prices={prices} />
        <RefreshPricesButton isRefreshing={refreshing} onRefresh={handleRefresh} />
        <HiddenAssetsNote hiddenCount={hiddenCount} />

      </div>

      {/*  Animation Background Dark Veil  */}
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
