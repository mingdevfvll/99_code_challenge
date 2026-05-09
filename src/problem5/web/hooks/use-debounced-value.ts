import * as React from 'react';

// Returns a value that lags behind the input by `delay` ms. Used by the
// search input so every keystroke doesn't push to the URL and refetch.
//
// Trailing-only (no leading edge): for a search box the user expects to
// finish typing before results update.

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setDebounced(value), delay);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, delay]);

  return debounced;
}
