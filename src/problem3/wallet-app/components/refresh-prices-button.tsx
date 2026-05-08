'use client';

interface RefreshPricesButtonProps {
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function RefreshPricesButton({ isRefreshing, onRefresh }: RefreshPricesButtonProps) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isRefreshing}
      className="w-full py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-gray-300 hover:bg-white/[0.10] hover:text-white active:scale-[0.98] disabled:opacity-50 transition-all duration-150"
    >
      {isRefreshing ? 'Updating…' : '↻  Refresh Prices'}
    </button>
  );
}
