import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion";
import { C, FONT } from "../theme";

/** Fade+rise used by nearly every element. Kept in one place so the whole
 * video moves with one rhythm instead of a dozen slightly different ones. */
export function useEnter(delay = 0, distance = 18) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.7 } });
  return { opacity: p, transform: `translateY(${(1 - p) * distance}px)` };
}

export function useFadeOut(endAt: number, over = 12) {
  const frame = useCurrentFrame();
  return interpolate(frame, [endAt - over, endAt], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export const Stage: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg }) => (
  <AbsoluteFill style={{ background: bg ?? C.bg, fontFamily: FONT, color: C.text }}>
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(1200px 700px at 50% 22%, rgba(198,69,92,0.09), transparent 62%)",
      }}
    />
    {children}
  </AbsoluteFill>
);

export const Eyebrow: React.FC<{ children: React.ReactNode; color?: string; delay?: number }> = ({
  children,
  color = C.brand,
  delay = 0,
}) => {
  const e = useEnter(delay, 10);
  return (
    <div
      style={{
        ...e,
        fontSize: 21,
        fontWeight: 800,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </div>
  );
};

export const Lead: React.FC<{
  children: React.ReactNode;
  size?: number;
  delay?: number;
  color?: string;
  weight?: number;
  maxWidth?: number;
  align?: "left" | "center";
  lineHeight?: number;
}> = ({
  children,
  size = 58,
  delay = 0,
  color = C.text,
  weight = 700,
  maxWidth = 1400,
  align = "left",
  lineHeight = 1.24,
}) => {
  const e = useEnter(delay);
  return (
    <div
      style={{
        ...e,
        fontSize: size,
        fontWeight: weight,
        color,
        maxWidth,
        lineHeight,
        letterSpacing: size > 46 ? "-0.02em" : "-0.01em",
        textAlign: align,
        // A centred block needs the box centred too, not just its text.
        marginLeft: align === "center" ? "auto" : undefined,
        marginRight: align === "center" ? "auto" : undefined,
      }}
    >
      {children}
    </div>
  );
};

export const Body: React.FC<{
  children: React.ReactNode;
  size?: number;
  delay?: number;
  color?: string;
  maxWidth?: number;
}> = ({ children, size = 30, delay = 0, color = C.muted, maxWidth = 1100 }) => {
  const e = useEnter(delay, 14);
  return (
    <div style={{ ...e, fontSize: size, lineHeight: 1.5, color, maxWidth, fontWeight: 500 }}>
      {children}
    </div>
  );
};

/** A persistent marker so someone skimming always knows where they are. */
export const ChapterChip: React.FC<{ label: string; index: number; total: number }> = ({
  label,
  index,
  total,
}) => (
  <div
    style={{
      position: "absolute",
      left: 64,
      bottom: 46,
      display: "flex",
      alignItems: "center",
      gap: 14,
      fontSize: 19,
      fontWeight: 700,
      letterSpacing: "0.10em",
      textTransform: "uppercase",
      color: C.faint,
      zIndex: 60,
    }}
  >
    <span style={{ color: C.brand }}>
      {String(index).padStart(2, "0")}
      <span style={{ color: C.faint }}>/{String(total).padStart(2, "0")}</span>
    </span>
    <span style={{ width: 1, height: 16, background: C.borderStrong }} />
    <span>{label}</span>
  </div>
);

export const Card: React.FC<{
  children: React.ReactNode;
  delay?: number;
  accent?: string;
  padding?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, accent, padding = 34, style }) => {
  const e = useEnter(delay);
  return (
    <div
      style={{
        ...e,
        background: C.surface,
        border: `1px solid ${accent ?? C.border}`,
        borderRadius: 22,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Tag: React.FC<{ children: React.ReactNode; tone?: string; delay?: number }> = ({
  children,
  tone = C.brand,
  delay = 0,
}) => {
  const e = useEnter(delay, 8);
  return (
    <span
      style={{
        ...e,
        display: "inline-block",
        padding: "7px 15px",
        borderRadius: 999,
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: tone,
        background: `color-mix(in srgb, ${tone} 16%, transparent)`,
        border: `1px solid color-mix(in srgb, ${tone} 38%, transparent)`,
      }}
    >
      {children}
    </span>
  );
};
