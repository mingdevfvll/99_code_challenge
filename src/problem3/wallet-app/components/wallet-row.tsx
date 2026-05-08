'use client';

import type { FormattedWalletBalance } from '../types/wallet';
import { formatUSD } from '../lib/format-usd';

interface ChainVisual {
  gradient: string;
  symbol: string;
  accent: string;
}

const CHAIN_STYLE: Record<string, ChainVisual> = {
  Osmosis: {
    gradient: 'from-fuchsia-500 via-purple-500 to-pink-500',
    symbol: '⚛',
    accent: 'shadow-fuchsia-500/25',
  },
  Ethereum: {
    gradient: 'from-blue-500 via-indigo-500 to-violet-600',
    symbol: 'Ξ',
    accent: 'shadow-blue-500/25',
  },
  Arbitrum: {
    gradient: 'from-sky-400 via-blue-500 to-indigo-600',
    symbol: '△',
    accent: 'shadow-sky-400/25',
  },
  Zilliqa: {
    gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    symbol: '◈',
    accent: 'shadow-emerald-400/25',
  },
  Neo: {
    gradient: 'from-lime-400 via-green-500 to-emerald-700',
    symbol: '◆',
    accent: 'shadow-lime-400/25',
  },
};

interface WalletRowProps {
  balance: FormattedWalletBalance;
  usdValue: number;
}

export function WalletRow({ balance, usdValue }: WalletRowProps) {
  const style = CHAIN_STYLE[balance.blockchain] ?? {
    gradient: 'from-zinc-500 to-zinc-700',
    symbol: '?',
    accent: 'shadow-zinc-500/20',
  };

  return (
    <div
      className={[
        'group font-mono text-sm tabular-nums',
        'grid grid-cols-[2.75rem_minmax(0,1fr)_minmax(8.25rem,auto)] grid-rows-2',
        'gap-x-4 gap-y-1.5 items-center',
        'rounded-xl border border-white/10 px-4 py-3',
      ].join(' ')}
    >
      <div
        className={[
          'row-span-2 flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-xl',
          'bg-gradient-to-br text-base font-bold leading-none text-white',
          'shadow-lg ring-1 ring-white/25',
          'transition-transform duration-200 ease-out group-hover:scale-105',
          style.gradient,
          style.accent,
        ].join(' ')}
        aria-hidden
      >
        <span className="drop-shadow-sm">{style.symbol}</span>
      </div>

      <p className="min-w-0 truncate font-medium text-white">{balance.currency}</p>
      <p className="text-right font-medium text-white">{balance.formatted}</p>

      <p className="min-w-0 truncate text-xs uppercase tracking-wide text-gray-500">
        {balance.blockchain}
      </p>
      <p className="text-right text-xs text-gray-400">{formatUSD(usdValue)}</p>
    </div>
  );
}
