import { useEffect, useRef, useState } from "react";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

export interface UseScrambleProps {
  text: string;
  trigger: boolean;
  speed?: number;
  onComplete?: () => void;
}

export interface UseScrambleReturn {
  displayText: string;
}

function randomFromCharset(): string {
  const index = Math.floor(Math.random() * CHARSET.length);
  return CHARSET[index]!;
}

function buildDisplay(text: string, resolvedCount: number): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    if (i < resolvedCount) {
      result += text[i];
    } else {
      result += randomFromCharset();
    }
  }
  return result;
}

export function useScramble({
  text,
  trigger,
  speed = 30,
  onComplete,
}: UseScrambleProps): UseScrambleReturn {
  const [displayText, setDisplayText] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!trigger) {
      return;
    }

    if (text.length === 0) {
      const id = window.setTimeout(() => {
        setDisplayText("");
        onCompleteRef.current?.();
      }, 0);
      return () => {
        window.clearTimeout(id);
      };
    }

    const totalTicks = Math.max(1, text.length * 2);
    let frame = 0;
    let finished = false;

    function clearTimer() {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function step() {
      const resolvedCount = Math.min(
        text.length,
        Math.ceil(((frame + 1) * text.length) / totalTicks),
      );

      setDisplayText(buildDisplay(text, resolvedCount));

      if (resolvedCount >= text.length) {
        finished = true;
        clearTimer();
        setDisplayText(text);
        onCompleteRef.current?.();
        return;
      }

      frame += 1;
    }

    step();
    if (!finished) {
      intervalRef.current = setInterval(step, speed);
    }

    return () => {
      clearTimer();
    };
  }, [trigger, text, speed]);

  return { displayText };
}
