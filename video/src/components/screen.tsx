import React from "react";
import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import { useEnter } from "./base";

export type Rect = { x: number; y: number; w: number; h: number };

const SRC_W = 1920;
const SRC_H = 1080;

/**
 * Footage plus the things drawn on top of it.
 *
 * The clips were captured at exactly 1920x1080, so a spotlight rectangle
 * is given in the same pixel coordinates the screen recording used — no
 * mapping, and no chance of the highlight drifting off the element it is
 * meant to be pointing at. Zoom and spotlight live inside one transformed
 * layer so a push-in moves the highlight with the pixels.
 */
export const Screen: React.FC<{
  src: string;
  /** Frames to trim from the start / end of the clip. */
  trimBefore?: number;
  trimAfter?: number;
  zoom?: number;
  /** Region to centre when zoomed, and/or to spotlight. */
  focus?: Rect;
  spotlight?: Rect | null;
  spotlightFrom?: number;
  spotlightLabel?: string;
  dim?: number;
  playbackRate?: number;
  muted?: boolean;
}> = ({
  src,
  trimBefore,
  trimAfter,
  zoom = 1,
  focus,
  spotlight,
  spotlightFrom = 0,
  spotlightLabel,
  dim = 0.72,
  playbackRate = 1,
}) => {
  const frame = useCurrentFrame();

  // Ease the push-in rather than cutting to it; a hard jump reads as a
  // different shot and costs the viewer their place.
  const z = interpolate(frame, [0, 26], [1, zoom], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cx = focus ? focus.x + focus.w / 2 : SRC_W / 2;
  const cy = focus ? focus.y + focus.h / 2 : SRC_H / 2;
  const tx = (SRC_W / 2 - cx) * (z - 1);
  const ty = (SRC_H / 2 - cy) * (z - 1);

  const spotOn = spotlight
    ? interpolate(frame, [spotlightFrom, spotlightFrom + 14], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${z})`,
          transformOrigin: "center center",
        }}
      >
        <OffthreadVideo
          src={staticFile(src)}
          trimBefore={trimBefore}
          trimAfter={trimAfter}
          playbackRate={playbackRate}
          muted
          style={{ width: SRC_W, height: SRC_H, objectFit: "cover" }}
        />
        {spotlight && (
          <>
            <div
              style={{
                position: "absolute",
                left: spotlight.x,
                top: spotlight.y,
                width: spotlight.w,
                height: spotlight.h,
                borderRadius: 14,
                boxShadow: `0 0 0 9999px rgba(6,7,10,${dim * spotOn})`,
                border: `${3 / z}px solid ${C.brand}`,
                opacity: spotOn,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: spotlight.x - 10,
                top: spotlight.y - 10,
                width: spotlight.w + 20,
                height: spotlight.h + 20,
                borderRadius: 18,
                border: `${2 / z}px solid ${C.brand}`,
                opacity: spotOn * interpolate(frame % 60, [0, 30, 60], [0.55, 0.12, 0.55]),
              }}
            />
          </>
        )}
      </AbsoluteFill>

      {spotlight && spotlightLabel && (
        <SpotLabel rect={spotlight} zoom={z} tx={tx} ty={ty} text={spotlightLabel} opacity={spotOn} />
      )}
    </AbsoluteFill>
  );
};

/** The label sits outside the zoom transform so type stays crisp, but is
 * positioned from the transformed rect so it still points at the thing. */
const SpotLabel: React.FC<{
  rect: Rect;
  zoom: number;
  tx: number;
  ty: number;
  text: string;
  opacity: number;
}> = ({ rect, zoom, tx, ty, text, opacity }) => {
  const sx = (rect.x + rect.w / 2 - SRC_W / 2) * zoom + SRC_W / 2 + tx;
  const sy = (rect.y - SRC_H / 2) * zoom + SRC_H / 2 + ty;
  // Near the top of frame there is no room above the rect, so the label
  // drops below it — far enough to clear the next row of UI.
  const below = sy < 190;
  const yy = below ? sy + rect.h * zoom + 44 : sy - 24;
  return (
    <div
      style={{
        position: "absolute",
        left: Math.min(Math.max(sx, 240), SRC_W - 240),
        top: yy,
        transform: `translate(-50%, ${below ? "0" : "-100%"})`,
        opacity,
        background: C.brand,
        color: "#fff",
        fontFamily: FONT,
        fontSize: 26,
        fontWeight: 800,
        padding: "12px 22px",
        borderRadius: 12,
        whiteSpace: "nowrap",
        boxShadow: "0 10px 34px rgba(0,0,0,0.55)",
      }}
    >
      {text}
    </div>
  );
};

/** Caption panel over footage. Sits in a corner the UI leaves empty, with
 * a scrim so it stays readable whatever is behind it. */
export const Caption: React.FC<{
  title?: string;
  children: React.ReactNode;
  where?: "bottom" | "top-right" | "bottom-right" | "top-left";
  delay?: number;
  width?: number;
  tone?: string;
}> = ({ title, children, where = "bottom", delay = 0, width = 900, tone = C.brand }) => {
  const e = useEnter(delay, 22);
  const pos: React.CSSProperties =
    where === "bottom"
      ? { left: 64, bottom: 96, width }
      : where === "top-right"
        ? { right: 64, top: 96, width }
        : where === "top-left"
          ? { left: 64, top: 96, width }
          : { right: 64, bottom: 96, width };

  return (
    <div
      style={{
        position: "absolute",
        ...pos,
        ...e,
        background: "rgba(14,16,22,0.93)",
        border: `1px solid ${C.border}`,
        borderLeft: `5px solid ${tone}`,
        borderRadius: 18,
        padding: "26px 32px",
        boxShadow: "0 24px 70px rgba(0,0,0,0.6)",
        fontFamily: FONT,
        zIndex: 50,
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 19,
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: tone,
            marginBottom: 12,
          }}
        >
          {title}
        </div>
      )}
      <div style={{ fontSize: 33, lineHeight: 1.42, fontWeight: 600, color: C.text }}>{children}</div>
    </div>
  );
};
