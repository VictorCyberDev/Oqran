import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../theme";

/** Section break. Gives a skimming viewer a place to land and makes the
 * ten minutes feel like a structure rather than a scroll. */
export const ChapterCard: React.FC<{
  index: number;
  total: number;
  title: string;
  blurb?: string;
  timecode?: string;
}> = ({ index, total, title, blurb, timecode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 200, mass: 0.8 } });
  const rule = interpolate(frame, [8, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const b = spring({ frame: frame - 16, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 120px",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 22,
          opacity: p,
          transform: `translateY(${(1 - p) * 16}px)`,
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "0.2em", color: C.brand }}>
          {String(index).padStart(2, "0")}
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.2em", color: C.faint }}>
          OF {String(total).padStart(2, "0")}
        </span>
        {timecode && (
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", color: C.faint }}>
            · {timecode}
          </span>
        )}
      </div>

      <div
        style={{
          height: 3,
          background: C.brand,
          width: `${rule * 190}px`,
          margin: "26px 0 30px",
          borderRadius: 2,
        }}
      />

      <div
        style={{
          fontSize: 92,
          fontWeight: 800,
          letterSpacing: "-0.035em",
          color: C.text,
          opacity: p,
          transform: `translateY(${(1 - p) * 26}px)`,
          lineHeight: 1.03,
        }}
      >
        {title}
      </div>

      {blurb && (
        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            fontWeight: 500,
            color: C.muted,
            maxWidth: 1250,
            lineHeight: 1.44,
            opacity: b,
            transform: `translateY(${(1 - b) * 14}px)`,
          }}
        >
          {blurb}
        </div>
      )}
    </div>
  );
};
