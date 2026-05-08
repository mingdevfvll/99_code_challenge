export interface ChainVisual {
  gradient: string;
  accent: string;
  /** Public URL under `/images/*` (files live in `public/images/`). */
  symbolSrc: string;
}

export const CHAIN_STYLE: Record<string, ChainVisual> = {
  Osmosis: {
    gradient: 'from-fuchsia-100 via-purple-100 to-pink-100',
    accent: 'shadow-fuchsia-300/30',
    symbolSrc: '/images/ico_osmosis.svg',
  },
  Ethereum: {
    gradient: 'from-blue-100 via-indigo-100 to-violet-100',
    accent: 'shadow-blue-300/30',
    symbolSrc: '/images/ico_eth.svg',
  },
  Arbitrum: {
    gradient: 'from-sky-100 via-blue-100 to-indigo-100',
    accent: 'shadow-sky-300/30',
    symbolSrc: '/images/ico_arb.svg',
  },
  Zilliqa: {
    gradient: 'from-emerald-100 via-teal-100 to-cyan-100',
    accent: 'shadow-emerald-300/30',
    symbolSrc: '/images/ico_zil.svg',
  },
  Neo: {
    gradient: 'from-lime-100 via-green-100 to-emerald-100',
    accent: 'shadow-lime-300/30',
    symbolSrc: '/images/ico_neo.svg',
  },
};
