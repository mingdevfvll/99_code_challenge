'use client';

import { CHAIN_STYLE } from '../lib/chain-visual-styles';
import { formatUSD } from '../lib/format-usd';
import type { FormattedWalletBalance } from '../types/wallet';

interface WalletRowProps {
  balance: FormattedWalletBalance;
  usdValue: number;
}

export function WalletRow({ balance, usdValue }: WalletRowProps) {
  const style = CHAIN_STYLE[balance.blockchain] ?? {
    gradient: 'from-zinc-100 to-zinc-200',
    accent: 'shadow-zinc-300/25',
    symbolSrc: '',
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
          'bg-gradient-to-br text-base font-bold leading-none',
          'shadow-md ring-1 ring-white/50',
          'transition-transform duration-200 ease-out group-hover:scale-105',
          style.gradient,
          style.accent,
        ].join(' ')}
        aria-hidden
      >
        {style.symbolSrc ? (
          <img
            src={style.symbolSrc}
            alt=""
            className="h-7 w-7 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
            width={28}
            height={28}
          />
        ) : (
          <span className="text-zinc-500 drop-shadow-sm">?</span>
        )}
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
