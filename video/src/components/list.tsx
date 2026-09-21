import React from "react";
import { C, FONT } from "../theme";
import { useEnter } from "./base";

/** Staggered statements. Each line gets its own beat so nothing appears
 * while the previous line is still being read. */
export const Statements: React.FC<{
  items: { text: string; at: number; tone?: string; strike?: boolean }[];
  size?: number;
  gap?: number;
}> = ({ items, size = 42, gap = 26 }) => (
  <div style={{ display: "flex", flexDirection: "column", gap, fontFamily: FONT }}>
    {items.map((it, i) => (
      <Row key={i} {...it} size={size} />
    ))}
  </div>
);

const Row: React.FC<{
  text: string;
  at: number;
  tone?: string;
  strike?: boolean;
  size: number;
}> = ({ text, at, tone = C.brand, strike, size }) => {
  const e = useEnter(at, 16);
  return (
    <div style={{ ...e, display: "flex", gap: 22, alignItems: "flex-start" }}>
      <span
        style={{
          width: 11,
          height: 11,
          borderRadius: 3,
          background: tone,
          marginTop: size * 0.38,
          flex: "0 0 auto",
        }}
      />
      <span
        style={{
          fontSize: size,
          lineHeight: 1.34,
          fontWeight: 600,
          color: C.text,
          textDecoration: strike ? "line-through" : "none",
          textDecorationColor: C.critical,
        }}
      >
        {text}
      </span>
    </div>
  );
};

/** Two-column disclosure table — used for the real-vs-simulated close. */
export const DisclosureTable: React.FC<{
  rows: { label: string; value: string; real: boolean; at: number }[];
}> = ({ rows }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT, width: "100%" }}>
    {rows.map((r, i) => (
      <DisclosureRow key={i} {...r} />
    ))}
  </div>
);

const DisclosureRow: React.FC<{ label: string; value: string; real: boolean; at: number }> = ({
  label,
  value,
  real,
  at,
}) => {
  const e = useEnter(at, 12);
  const tone = real ? C.low : C.guarded;
  return (
    <div
      style={{
        ...e,
        display: "flex",
        alignItems: "center",
        gap: 24,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderLeft: `5px solid ${tone}`,
        borderRadius: 14,
        padding: "18px 26px",
      }}
    >
      <span
        style={{
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: tone,
          width: 132,
          flex: "0 0 auto",
        }}
      >
        {real ? "Real" : "Simulated"}
      </span>
      <span style={{ fontSize: 28, fontWeight: 700, color: C.text, width: 470, flex: "0 0 auto" }}>
        {label}
      </span>
      <span style={{ fontSize: 25, fontWeight: 500, color: C.muted, lineHeight: 1.35 }}>{value}</span>
    </div>
  );
};
