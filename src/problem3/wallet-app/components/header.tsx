'use client';

export function Header() {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs text-gray-400 mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Simulated Live Prices
      </div>
      <h1 className="text-2xl font-bold tracking-tight">M-Wallet</h1>
      <p className="text-gray-500 text-sm mt-1">Multi-chain portfolio</p>
    </div>
  );
}
