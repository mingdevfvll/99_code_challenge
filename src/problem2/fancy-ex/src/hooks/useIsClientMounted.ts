import { useEffect, useState } from "react";

/** True after mount on the client — use to avoid SSR/client markup mismatch (e.g. theme icons). */
export function useIsClientMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return isMounted;
}
