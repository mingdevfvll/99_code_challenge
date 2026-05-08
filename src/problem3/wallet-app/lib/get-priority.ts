import type { Blockchain } from '../types/wallet';

// Higher return value = higher position in the list.
export function getPriority(blockchain: Blockchain | string): number {
  switch (blockchain) {
    case 'Osmosis':
      return 100;
    case 'Ethereum':
      return 50;
    case 'Arbitrum':
      return 30;
    case 'Zilliqa':
      return 20;
    case 'Neo':
      return 20;
    default:
      return -99;
  }
}
