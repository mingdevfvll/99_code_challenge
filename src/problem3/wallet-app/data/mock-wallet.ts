import type { WalletBalance } from '../types/wallet';

// In production these come from useWalletBalances() / usePrices() hooks.
// Two entries are intentionally invalid to demonstrate the filter logic:
//   - 'Unknown' blockchain  → priority -99 → filtered out
//   - PEPE with amount 0    → filtered out

export const MOCK_BALANCES: WalletBalance[] = [
  { blockchain: 'Osmosis', currency: 'OSMO', amount: 1_847.32 },
  { blockchain: 'Ethereum', currency: 'ETH', amount: 2.5831 },
  { blockchain: 'Ethereum', currency: 'USDC', amount: 4_200.0 },
  { blockchain: 'Arbitrum', currency: 'ARB', amount: 632.9 },
  { blockchain: 'Zilliqa', currency: 'ZIL', amount: 18_000 },
  { blockchain: 'Neo', currency: 'NEO', amount: 31.5 },
  { blockchain: 'Unknown', currency: 'XYZ', amount: 500 }, // filtered: unknown chain
  { blockchain: 'Ethereum', currency: 'PEPE', amount: 0 }, // filtered: zero amount
];

export const BASE_PRICES: Record<string, number> = {
  OSMO: 0.85,
  ETH: 3_200,
  USDC: 1.0,
  ARB: 1.2,
  ZIL: 0.015,
  NEO: 12.5,
};
