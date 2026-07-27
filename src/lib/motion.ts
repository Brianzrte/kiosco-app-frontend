/** Single source for motion durations. No literal ms values outside this file. */
export const MOTION = {
  fast: 120,
  base: 200,
  slow: 320,
  /** A pending action only shows a spinner after this many ms, to avoid flicker on fast responses. */
  spinnerDelay: 400,
} as const;
