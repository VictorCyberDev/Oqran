import React from "react";
import { Series, interpolate, useCurrentFrame } from "remotion";
import { C, s } from "../theme";
import { Stage, ChapterChip, Lead, Eyebrow } from "../components/base";
import { ChapterCard } from "../components/chapter";
import { Screen, Caption } from "../components/screen";
import { FlowDiagram } from "../components/flow";
import { CLIP, col } from "../clips";

const CH = { label: "The core idea", index: 5 };

/** Most platforms stop at the notification. Showing the dead end first is
 * what makes the second diagram mean anything. */
const DeadEnd: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <FlowDiagram
        title="What most platforms do"
        nodes={[
          { id: "sig", label: "Fraud signal", sub: "bank sees risk", x: 460, y: 430, at: 0, tone: C.guarded },
          { id: "alert", label: "Alert / email", sub: "sent onward", x: 960, y: 430, at: 14, tone: C.guarded },
          { id: "void", label: "Nothing", sub: "no owner, no status", x: 1460, y: 430, at: 30, tone: C.reject, muted: true },
        ]}
        edges={[
          { from: "sig", to: "alert", at: 10, tone: C.guarded },
          { from: "alert", to: "void", at: 26, tone: C.reject, dashed: true },
        ]}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 620,
          textAlign: "center",
          opacity: interpolate(frame, [s(2.2), s(3.2)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <Lead size={44} align="center" maxWidth={1400} color={C.muted}>
          The institution that raised it cannot see whether anyone acted. The one that received it has no record to work.
        </Lead>
      </div>
      <ChapterChip {...CH} total={8} />
    </Stage>
  );
};

const RealFlow: React.FC = () => (
  <Stage>
    <FlowDiagram
      title="What OQRAN does"
      nodes={[
        { id: "sig", label: "Fraud signal", sub: "Bank compliance", x: 340, y: 380, at: 0, tone: C.brand },
        { id: "case", label: "Case record", sub: "one row, one owner", x: 960, y: 380, at: 20, tone: C.brand, w: 340 },
        { id: "gov", label: "Government queue", sub: "investigator opens it", x: 1590, y: 380, at: 40, tone: C.brand, w: 330 },
        { id: "trail", label: "Investigation trail", sub: "notes + status, hash-chained", x: 1590, y: 660, at: 66, tone: C.low, w: 330 },
        { id: "back", label: "Bank sees the status", sub: "the loop closes", x: 340, y: 660, at: 84, tone: C.low, w: 340 },
      ]}
      edges={[
        { from: "sig", to: "case", label: "escalate", at: 14, tone: C.brand },
        { from: "case", to: "gov", label: "lands in the queue", at: 34, tone: C.brand },
        { from: "gov", to: "trail", at: 60, tone: C.low, side: "v" },
        { from: "trail", to: "back", label: "same record, both sides", at: 78, tone: C.low },
      ]}
      caption="Not a notification — a row in a shared table that both institutions can act on."
    />
    <ChapterChip {...CH} total={8} />
  </Stage>
);

export const CH5_FRAMES =
  s(7) + s(9) + s(13) + s(8) + s(9) + s(8) + s(9) + s(10) + s(8) + s(9);

export const Ch5Core: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={s(7)}>
      <Stage>
        <ChapterCard
          index={5}
          total={8}
          timecode="The core idea"
          title="Bank → Government, end to end"
          blurb="This handoff is the whole thesis. Everything else on the platform exists to make it possible."
        />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(9)}>
      <DeadEnd />
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(13)}>
      <RealFlow />
    </Series.Sequence>

    {/* ---- real footage: the bank side ---- */}
    <Series.Sequence durationInFrames={s(8)}>
      <Stage>
        <Screen src={CLIP.bankEsc.file} trimBefore={s(9)} spotlight={col(50, 120)} spotlightFrom={s(1.4)} spotlightLabel="Critical · watchlist match · SLA breached" />
        <Caption title="Real footage — bank side" delay={6} width={960}>
          A critical velocity alert on an address already matched to the CBN/NIBSS watchlist.
        </Caption>
        <ChapterChip {...CH} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(9)}>
      <Stage>
        <Screen src={CLIP.bankEsc.file} trimBefore={s(17)} zoom={1.25} focus={col(400, 420)} />
        <Caption title="The officer writes the context" delay={6} width={1000}>
          Not a form field nobody reads — the sentence the investigator on the other side will open the case with.
        </Caption>
        <ChapterChip {...CH} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Stage>
        <Screen
          src={CLIP.bankEsc.file}
          trimBefore={s(20.4)}
          zoom={1.5}
          focus={col(700, 130)}
          spotlight={col(712, 92)}
          spotlightFrom={s(0.7)}
          spotlightLabel="Case OQ-CASE-3270 raised"
        />
        <Caption title="A reference, not a receipt" delay={6} width={980} where="top-right">
          &ldquo;Now visible to Government investigators, who can annotate and change its status.&rdquo;
        </Caption>
        <ChapterChip {...CH} total={8} />
      </Stage>
    </Series.Sequence>

    {/* ---- real footage: the government side ---- */}
    <Series.Sequence durationInFrames={s(9)}>
      <Stage>
        <Screen
          src={CLIP.govRecv.file}
          trimBefore={s(5)}
          spotlight={col(120, 100)}
          spotlightFrom={s(1.6)}
          spotlightLabel="From banks: 2"
        />
        <Caption title="Real footage — government side, same case" delay={6} width={1000}>
          A different account, a different role, a different screen. The case the bank just raised is already in the queue.
        </Caption>
        <ChapterChip {...CH} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(10)}>
      <Stage>
        <Screen
          src={CLIP.govRecv.file}
          trimBefore={s(17)}
          zoom={1.3}
          focus={col(160, 400)}
          spotlight={col(175, 130)}
          spotlightFrom={s(2.0)}
          spotlightLabel="Context from the originator"
        />
        <Caption title="The bank's sentence, carried across" delay={6} width={1020} where="bottom-right">
          The investigator opens the case reading exactly what the compliance officer wrote, with the fraud signal and
          watchlist reference attached.
        </Caption>
        <ChapterChip {...CH} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Stage>
        <Screen
          src={CLIP.govRecv.file}
          trimBefore={s(24.5)}
          zoom={1.3}
          focus={col(480, 420)}
          spotlight={col(770, 90)}
          spotlightFrom={s(1.2)}
          spotlightLabel="Investigation trail (1)"
        />
        <Caption title="Status and note go on the shared record" delay={6} width={1000}>
          Under investigation, with a note and a timestamp. Both institutions are now looking at the same row.
        </Caption>
        <ChapterChip {...CH} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(9)}>
      <Stage>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 140px" }}>
          <Eyebrow>Why this is the differentiator</Eyebrow>
          <div style={{ height: 34 }} />
          <Lead size={60} delay={s(0.4)} maxWidth={1560}>
            Any one of these dashboards could be built alone. None of them is worth much alone.
          </Lead>
          <div style={{ height: 40 }} />
          <Lead size={38} delay={s(3.6)} weight={600} color={C.muted} maxWidth={1500}>
            The value is that the bank&rsquo;s signal became the government&rsquo;s case, and the government&rsquo;s flag
            reaches the citizen and the delivery driver.
          </Lead>
        </div>
        <ChapterChip {...CH} total={8} />
      </Stage>
    </Series.Sequence>
  </Series>
);
