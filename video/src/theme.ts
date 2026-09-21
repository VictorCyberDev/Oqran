/**
 * The video reuses OQRAN's own tokens rather than inventing a second
 * palette — a submission video that looks like a different product is a
 * missed chance to make the brand read as deliberate.
 *
 * Everything is the dark theme: the footage was captured dark, and
 * cutting between a light deck and dark footage would strobe.
 */
export const C = {
  bg: "#0e1016",
  bgAlt: "#12141b",
  surface: "#1d1f26",
  surfaceHi: "#252831",
  sunken: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.18)",

  text: "#ededee",
  muted: "rgba(237,237,238,0.64)",
  faint: "rgba(237,237,238,0.40)",

  brand: "#c6455c",
  brandDeep: "#8c1b2e",
  brandGlow: "rgba(198,69,92,0.16)",

  low: "#2f8f5b",
  guarded: "#c98a2b",
  elevated: "#d9722b",
  critical: "#d6293d",

  /** Rejected options read as inert slate, never as another brand colour —
   * the eye should go to what was built. */
  reject: "#6b7280",
  rejectBg: "rgba(107,114,128,0.10)",
  rejectBorder: "rgba(107,114,128,0.40)",
} as const;

export const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif';

export const FPS = 30;

/** Seconds → frames. */
export const s = (sec: number) => Math.round(sec * FPS);

/**
 * Comfortable silent-reading time for a line of on-screen text.
 *
 * Tuned to roughly 2.4 words/second plus a beat to land and a beat to
 * leave — about 3s for a short sentence, which is the brief's rule. A
 * viewer reading a tradeoff needs longer than one reading a label, so
 * `weight` stretches it rather than making every card the same length.
 */
export function readSec(text: string, weight = 1): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2.8, 0.9 + words / 2.4) * weight;
}

export function readFrames(text: string, weight = 1): number {
  return s(readSec(text, weight));
}
