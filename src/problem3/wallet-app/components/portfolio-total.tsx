'use client';

import { formatUSD } from '../lib/format-usd';

interface PortfolioTotalProps {
  totalUsdValue: number;
  assetCount: number;
  chainCount: number;
}

export function PortfolioTotal({ totalUsdValue, assetCount, chainCount }: PortfolioTotalProps) {
  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-600/80 to-indigo-700/80 border border-violet-500/30">
      <p className="text-xs font-medium text-violet-300 uppercase tracking-wider mb-2">
        Total Portfolio Value
      </p>
      <p className="text-4xl font-bold tracking-tight tabular-nums">{formatUSD(totalUsdValue)}</p>
      <p className="text-xs text-violet-400 mt-3">
        {assetCount} active asset{assetCount !== 1 ? 's' : ''} across {chainCount} chain
        {chainCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
