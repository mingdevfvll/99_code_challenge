export type Blockchain = 'Osmosis' | 'Ethereum' | 'Arbitrum' | 'Zilliqa' | 'Neo';

export interface WalletBalance {
  currency: string;
  amount: number;
  blockchain: Blockchain | string;
}

export interface FormattedWalletBalance extends WalletBalance {
  formatted: string;
}
