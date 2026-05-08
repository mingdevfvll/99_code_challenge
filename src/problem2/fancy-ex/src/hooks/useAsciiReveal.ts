import { useEffect, useRef, useState } from "react";

export interface UseAsciiRevealProps {
  art: string;
  speed?: number;
  onComplete?: () => void;
}

export interface UseAsciiRevealReturn {
  displayed: string;
  isDone: boolean;
}

function getNextCursor(art: string, cursor: number): number {
  let nextCursor = cursor + 1;

  while (nextCursor < art.length && art[nextCursor] === "\n") {
    nextCursor += 1;
  }

  return nextCursor;
}

export function useAsciiReveal({
  art,
  speed = 18,
  onComplete,
}: UseAsciiRevealProps): UseAsciiRevealReturn {
  const [displayed, setDisplayed] = useState("");
  const [isDone, setIsDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let cursor = 0;

    function clearTimer() {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function finish() {
      clearTimer();
      setDisplayed(art);
      setIsDone(true);
      onCompleteRef.current?.();
    }

    function revealNext() {
      cursor = getNextCursor(art, cursor);
      setDisplayed(art.slice(0, cursor));

      if (cursor >= art.length) {
        finish();
      }
    }

    const startId = window.setTimeout(() => {
      setDisplayed("");
      setIsDone(false);

      if (art.length === 0) {
        finish();
        return;
      }

      intervalRef.current = setInterval(revealNext, speed);
    }, 0);

    return () => {
      window.clearTimeout(startId);
      clearTimer();
    };
  }, [art, speed]);

  return { displayed, isDone };
}
