'use client';

interface HiddenAssetsNoteProps {
  hiddenCount: number;
}

export function HiddenAssetsNote({ hiddenCount }: HiddenAssetsNoteProps) {
  if (hiddenCount <= 0) return null;

  return (
    <p className="text-center text-xs text-gray-700 pt-1">
      {hiddenCount} asset{hiddenCount !== 1 ? 's' : ''} hidden
      &nbsp;(zero balance or unknown chain)
    </p>
  );
}
