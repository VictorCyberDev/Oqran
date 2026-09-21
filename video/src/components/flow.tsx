import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../theme";

/**
 * Animated node/arrow diagrams.
 *
 * A process — a bank handing a case to government, a write being held and
 * replayed — lands far faster as a drawn flow than as a paragraph someone
 * has to read while also watching a screen recording. Arrows draw in
 * sequence so the viewer's eye is led along the path in the order it
 * actually happens.
 */
export type Node = {
  id: string;
  label: string;
  sub?: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  tone?: string;
  at?: number;
  muted?: boolean;
};

export type Edge = {
  from: string;
  to: string;
  label?: string;
  at?: number;
  tone?: string;
  dashed?: boolean;
  /** Which sides to leave/enter from. */
  side?: "h" | "v";
  /** Nudges the label off the line when two edges run close together. */
  labelDy?: number;
};

/** Arrowheads are pre-declared per colour; SVG markers can't inherit stroke. */
const MARKER_TONES = [C.brand, C.reject, C.low, C.guarded, C.critical] as const;

const NW = 300;
const NH = 130;

export const FlowDiagram: React.FC<{
  title?: string;
  nodes: Node[];
  edges: Edge[];
  caption?: string;
}> = ({ title, nodes, edges, caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const anchor = (n: Node, dir: "r" | "l" | "t" | "b") => {
    const w = n.w ?? NW;
    const h = n.h ?? NH;
    if (dir === "r") return { x: n.x + w / 2, y: n.y };
    if (dir === "l") return { x: n.x - w / 2, y: n.y };
    if (dir === "b") return { x: n.x, y: n.y + h / 2 };
    return { x: n.x, y: n.y - h / 2 };
  };

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT }}>
      {title && (
        <div
          style={{
            position: "absolute",
            top: 88,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 42,
            fontWeight: 700,
            color: C.text,
            letterSpacing: "-0.02em",
            opacity: spring({ frame, fps, config: { damping: 200 } }),
          }}
        >
          {title}
        </div>
      )}

      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          {MARKER_TONES.map((col, i) => (
            <marker
              key={i}
              id={`arw${i}`}
              markerWidth="9"
              markerHeight="9"
              refX="7.2"
              refY="4.5"
              orient="auto"
            >
              <path d="M0,0 L9,4.5 L0,9 z" fill={col} />
            </marker>
          ))}
        </defs>
        {edges.map((e, i) => {
          const a = byId[e.from];
          const b = byId[e.to];
          if (!a || !b) return null;
          const vertical = e.side === "v" || Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
          const p1 = anchor(a, vertical ? (b.y > a.y ? "b" : "t") : b.x > a.x ? "r" : "l");
          const p2 = anchor(b, vertical ? (b.y > a.y ? "t" : "b") : b.x > a.x ? "l" : "r");
          const tone = e.tone ?? C.brand;
          const markerIdx = (MARKER_TONES as readonly string[]).indexOf(tone);
          const at = e.at ?? 0;
          const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const draw = interpolate(frame, [at, at + 22], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const gap = 14;
          const ux = (p2.x - p1.x) / (len || 1);
          const uy = (p2.y - p1.y) / (len || 1);
          const sx = p1.x + ux * gap;
          const sy = p1.y + uy * gap;
          const ex = p2.x - ux * gap;
          const ey = p2.y - uy * gap;
          const dl = Math.hypot(ex - sx, ey - sy);
          return (
            <g key={i}>
              <line
                x1={sx}
                y1={sy}
                x2={ex}
                y2={ey}
                stroke={tone}
                strokeWidth={3.4}
                strokeDasharray={e.dashed ? "10 9" : `${dl} ${dl}`}
                strokeDashoffset={e.dashed ? 0 : dl * (1 - draw)}
                opacity={e.dashed ? draw * 0.75 : draw}
                markerEnd={draw > 0.96 ? `url(#arw${markerIdx < 0 ? 0 : markerIdx})` : undefined}
              />
              {e.label && (
                <foreignObject
                  x={(sx + ex) / 2 - 190}
                  y={(sy + ey) / 2 - 34 + (e.labelDy ?? 0)}
                  width={380}
                  height={70}
                  opacity={interpolate(frame, [at + 14, at + 30], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}
                >
                  {/* Only the text sits on an opaque chip; a full-width
                      box would paint a visible band over the line. */}
                  <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                    <span
                      style={{
                        fontFamily: FONT,
                        fontSize: 23,
                        fontWeight: 700,
                        color: tone,
                        background: C.bg,
                        padding: "5px 14px",
                        borderRadius: 8,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.label}
                    </span>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>

      {nodes.map((n) => (
        <NodeBox key={n.id} n={n} />
      ))}

      {caption && (
        <div
          style={{
            position: "absolute",
            bottom: 108,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 30,
            fontWeight: 600,
            color: C.muted,
            opacity: interpolate(frame, [40, 62], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
};

const NodeBox: React.FC<{ n: Node }> = ({ n }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - (n.at ?? 0), fps, config: { damping: 200, mass: 0.7 } });
  const tone = n.tone ?? C.brand;
  const w = n.w ?? NW;
  const h = n.h ?? NH;
  return (
    <div
      style={{
        position: "absolute",
        left: n.x - w / 2,
        top: n.y - h / 2,
        width: w,
        height: h,
        opacity: p * (n.muted ? 0.45 : 1),
        transform: `scale(${0.94 + p * 0.06})`,
        background: n.muted ? C.rejectBg : "rgba(29,31,38,0.95)",
        border: `2px solid ${n.muted ? C.rejectBorder : tone}`,
        borderRadius: 18,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: "0 20px",
        textAlign: "center",
        fontFamily: FONT,
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: 29, fontWeight: 700, color: n.muted ? C.muted : C.text, lineHeight: 1.18 }}>
        {n.label}
      </div>
      {n.sub && (
        <div style={{ fontSize: 21, fontWeight: 600, color: n.muted ? C.faint : tone, lineHeight: 1.25 }}>
          {n.sub}
        </div>
      )}
    </div>
  );
};
