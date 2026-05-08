import { useCallback, useEffect, useRef, useState } from "react";

import { useAsciiReveal } from "@/hooks/useAsciiReveal";
import { useCenterOutScramble } from "@/hooks/useCenterOutScramble";
import { useScramble } from "@/hooks/useScramble";

const ASCII_HEAD = ` ___  ___  ____  ____  ____ 
/ __)/ __)/ ___)(  _ \\(  __)
\\__ \\\\__ \\\\__ \\ ) __/ ) _) 
(___/(___/(____/(__)  (____)`;
const ASCII_LOGO_LINE_PREFIX = "     ";
/** Same width keeps the ASCII block aligned while scrambling. */
const TAGLINE_WIDTH = 21;
const TAGLINES = [
  "CURRENCY SWAP  v1.0".padEnd(TAGLINE_WIDTH),
  "MOVE VALUE IN ONE TAP",
] as const;
const ASCII_ART = `${ASCII_HEAD}
${ASCII_LOGO_LINE_PREFIX}${TAGLINES[0]}`;
const SUBTITLE = "DECENTRALIZED · INSTANT · TRUSTLESS";

export interface AsciiLogoProps {
  onComplete?: () => void;
}

function buildDisplayedArt(displayed: string, isDone: boolean, idleLine: string) {
  if (!isDone) return displayed;

  return `${ASCII_HEAD}
${ASCII_LOGO_LINE_PREFIX}${idleLine}`;
}

export function AsciiLogo({ onComplete }: AsciiLogoProps) {
  const [isScrambling, setIsScrambling] = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const subtitleCompleteRef = useRef(false);
  const { displayed, isDone } = useAsciiReveal({ art: ASCII_ART });
  const nextTagline = TAGLINES[(taglineIndex + 1) % TAGLINES.length];
  const { displayText } = useScramble({
    text: nextTagline,
    trigger: isScrambling,
    onComplete: () => {
      setIsScrambling(false);
      setTaglineIndex((i) => (i + 1) % TAGLINES.length);
    },
  });
  const idleLine = isScrambling ? displayText : TAGLINES[taglineIndex];
  const displayedArt = buildDisplayedArt(displayed, isDone, idleLine);

  const handleSubtitleAnimationComplete = useCallback(() => {
    if (subtitleCompleteRef.current) return;
    subtitleCompleteRef.current = true;
    onComplete?.();
  }, [onComplete]);

  const { displayText: subtitleDisplay } = useCenterOutScramble({
    text: SUBTITLE,
    active: isDone,
    speed: 38,
    onComplete: handleSubtitleAnimationComplete,
  });

  useEffect(() => {
    if (!isDone) return;

    const id = window.setInterval(() => {
      setIsScrambling(true);
    }, 4_000);

    return () => {
      window.clearInterval(id);
    };
  }, [isDone]);

  return (
    <div className="flex min-w-[280px] max-w-full shrink-0 flex-col items-center gap-3">
      <div className="flex justify-center w-[222px]">
        <pre
          className="m-0 block w-fit max-w-full select-none font-mono text-xs leading-tight text-primary"
          aria-hidden="true"
        >
          {displayedArt}
        </pre>
      </div>
      {isDone ? (
        <p className="w-full text-center font-mono text-[10px] tracking-[0.25em] text-muted-fg">
          {subtitleDisplay}
        </p>
      ) : null}
    </div>
  );
}
