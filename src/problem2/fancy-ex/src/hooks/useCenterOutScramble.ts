import { useEffect, useMemo, useRef, useState } from "react";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

function randomFromCharset(): string {
  const index = Math.floor(Math.random() * CHARSET.length);
  return CHARSET[index]!;
}

/** Distance from index i to the nearest center slot (two slots when length is even). */
function ringDistance(i: number, length: number): number {
  const leftC = Math.floor((length - 1) / 2);
  const rightC = Math.floor(length / 2);
  return Math.min(Math.abs(i - leftC), Math.abs(i - rightC));
}

function buildCenterOutDisplay(text: string, wave: number): string {
  let result = "";
  const L = text.length;
  for (let i = 0; i < L; i++) {
    if (ringDistance(i, L) <= wave) {
      result += text[i]!;
    } else {
      result += randomFromCharset();
    }
  }
  return result;
}

function computeMaxWave(length: number): number {
  let maxWave = 0;
  for (let i = 0; i < length; i++) {
    maxWave = Math.max(maxWave, ringDistance(i, length));
  }
  return maxWave;
}

export interface UseCenterOutScrambleProps {
  text: string;
  active: boolean;
  speed?: number;
  onComplete?: () => void;
}

export interface UseCenterOutScrambleReturn {
  displayText: string;
}

/**
 * Resolves text from the center outward (both halves meet at the middle),
 * with unresolved cells showing random charset glyphs until their ring is revealed.
 */
export function useCenterOutScramble({
  text,
  active,
  speed = 36,
  onComplete,
}: UseCenterOutScrambleProps): UseCenterOutScrambleReturn {
  const maxWave = useMemo(() => computeMaxWave(text.length), [text]);
  const [wave, setWave] = useState(-1);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const displayText = useMemo(() => {
    if (!active || text.length === 0) return "";
    if (wave < maxWave) return buildCenterOutDisplay(text, wave);
    return text;
  }, [active, text, wave, maxWave]);

  useEffect(() => {
    if (!active || text.length === 0) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let waveLocal = -1;

    function scheduleStep() {
      if (cancelled) return;
      waveLocal += 1;
      setWave(waveLocal);
      if (waveLocal >= maxWave) {
        onCompleteRef.current?.();
        return;
      }
      timeoutId = window.setTimeout(scheduleStep, speed);
    }

    timeoutId = window.setTimeout(scheduleStep, 0);

    return () => {
      cancelled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [active, text, maxWave, speed]);

  return { displayText };
}
