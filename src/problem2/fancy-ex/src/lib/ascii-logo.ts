export const ASCII_HEAD = ` ___  ___  ____  ____  ____ 
/ __)/ __)/ ___)(  _ \\(  __)
\\__ \\\\__ \\\\__ \\ ) __/ ) _) 
(___/(___/(____/(__)  (____)`;

export const ASCII_LOGO_LINE_PREFIX = "     ";

/** Same width keeps the ASCII block aligned while scrambling. */
const TAGLINE_WIDTH = 21;

export const TAGLINES = [
  "CURRENCY SWAP  v1.0".padEnd(TAGLINE_WIDTH),
  "MOVE VALUE IN ONE TAP",
] as const;

export const ASCII_ART = `${ASCII_HEAD}
${ASCII_LOGO_LINE_PREFIX}${TAGLINES[0]}`;

export const SUBTITLE = "DECENTRALIZED · INSTANT · TRUSTLESS";
