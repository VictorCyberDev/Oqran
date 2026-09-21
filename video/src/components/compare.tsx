import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../theme";
import { useEnter } from "./base";

/**
 * Side-by-side "considered vs built".
 *
 * Without narration this is the only reliable way to show a tradeoff: the
 * rejected option has to be visible, not merely described, or the viewer
 * has no idea what was weighed. The rejected panel is deliberately inert
 * slate and slightly dimmed so the eye lands on the right-hand side, and
 * it is struck through once the verdict animates in.
 */
export const SplitCompare: React.FC<{
  question: string;
  rejected: { title: string; points: string[]; verdict: string };
  built: { title: string; points: string[]; verdict: string };
  /** Frame at which the verdicts (✕ / ✓) resolve. */
  verdictAt?: number;
}> = ({ question, rejected, built, verdictAt = 120 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const q = useEnter(0, 14);
  const vp = spring({ frame: frame - verdictAt, fps, config: { damping: 200, mass: 0.6 } });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 90px",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          ...q,
          fontSize: 44,
          fontWeight: 700,
          color: C.text,
          marginBottom: 46,
          letterSpacing: "-0.02em",
        }}
      >
        {question}
      </div>

      <div style={{ display: "flex", gap: 40, alignItems: "stretch" }}>
        <Panel
          kind="rejected"
          delay={12}
          title={rejected.title}
          points={rejected.points}
          verdict={rejected.verdict}
          verdictProgress={vp}
        />
        <Panel
          kind="built"
          delay={24}
          title={built.title}
          points={built.points}
          verdict={built.verdict}
          verdictProgress={vp}
        />
      </div>
    </div>
  );
};

const Panel: React.FC<{
  kind: "rejected" | "built";
  title: string;
  points: string[];
  verdict: string;
  delay: number;
  verdictProgress: number;
}> = ({ kind, title, points, verdict, delay, verdictProgress }) => {
  const rejected = kind === "rejected";
  const e = useEnter(delay, 26);
  const accent = rejected ? C.reject : C.brand;
  const dim = rejected ? interpolate(verdictProgress, [0, 1], [1, 0.52]) : 1;

  return (
    <div
      style={{
        ...e,
        flex: 1,
        opacity: (e.opacity as number) * dim,
        background: rejected ? C.rejectBg : "rgba(198,69,92,0.07)",
        border: `2px solid ${rejected ? C.rejectBorder : "rgba(198,69,92,0.55)"}`,
        borderRadius: 24,
        padding: "32px 36px 34px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        position: "relative",
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: accent,
        }}
      >
        {rejected ? "Considered" : "What we built"}
      </div>

      <div
        style={{
          fontSize: 38,
          fontWeight: 700,
          color: C.text,
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          textDecoration: rejected && verdictProgress > 0.5 ? "line-through" : "none",
          textDecorationColor: C.critical,
          textDecorationThickness: 3,
        }}
      >
        {title}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 13, flex: 1 }}>
        {points.map((p, i) => (
          <Point key={i} text={p} delay={delay + 12 + i * 8} color={accent} />
        ))}
      </div>

      <div
        style={{
          opacity: verdictProgress,
          transform: `translateY(${(1 - verdictProgress) * 10}px)`,
          display: "flex",
          alignItems: "center",
          gap: 14,
          borderTop: `1px solid ${rejected ? C.rejectBorder : "rgba(198,69,92,0.4)"}`,
          paddingTop: 20,
        }}
      >
        <Badge ok={!rejected} />
        <span style={{ fontSize: 27, fontWeight: 700, color: rejected ? C.muted : C.text, lineHeight: 1.35 }}>
          {verdict}
        </span>
      </div>
    </div>
  );
};

const Point: React.FC<{ text: string; delay: number; color: string }> = ({ text, delay, color }) => {
  const e = useEnter(delay, 10);
  return (
    <div style={{ ...e, display: "flex", gap: 14, alignItems: "flex-start" }}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: color,
          marginTop: 12,
          flex: "0 0 auto",
        }}
      />
      <span style={{ fontSize: 26, lineHeight: 1.45, color: C.muted, fontWeight: 500 }}>{text}</span>
    </div>
  );
};

const Badge: React.FC<{ ok: boolean }> = ({ ok }) => (
  <span
    style={{
      width: 40,
      height: 40,
      borderRadius: 999,
      flex: "0 0 auto",
      background: ok ? "rgba(198,69,92,0.18)" : "rgba(214,41,61,0.16)",
      border: `2px solid ${ok ? C.brand : C.critical}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      {ok ? (
        <path d="M5 13l4 4L19 7" stroke={C.brand} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M6 6l12 12M18 6L6 18" stroke={C.critical} strokeWidth={3.2} strokeLinecap="round" />
      )}
    </svg>
  </span>
);
