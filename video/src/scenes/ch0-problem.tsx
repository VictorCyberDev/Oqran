import React from "react";
import { Series, interpolate, useCurrentFrame } from "remotion";
import { C, s } from "../theme";
import { Stage, Lead, Body, Eyebrow, ChapterChip } from "../components/base";
import { Statements } from "../components/list";
import { FlowDiagram } from "../components/flow";

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const rule = interpolate(frame, [18, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 140px" }}>
        <Eyebrow delay={0}>Hackathon submission</Eyebrow>
        <div style={{ height: 26 }} />
        <Lead size={132} delay={6} weight={800}>
          OQRAN
        </Lead>
        <div style={{ height: 3, background: C.brand, width: `${rule * 300}px`, margin: "30px 0 30px", borderRadius: 2 }} />
        <Lead size={46} delay={20} weight={600} color={C.muted} maxWidth={1300}>
          A shared map of location risk for Nigerian banks, government, businesses and citizens.
        </Lead>
        <div style={{ height: 46 }} />
        <Body delay={40} size={28} color={C.faint}>
          No narration. Everything is on screen — read at your own pace.
        </Body>
      </div>
    </Stage>
  );
};

const Problem: React.FC = () => (
  <Stage>
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 140px" }}>
      <Eyebrow>One street. Four institutions.</Eyebrow>
      <div style={{ height: 44 }} />
      <Statements
        size={44}
        items={[
          { text: "A bank in Lagos verifies an address before opening an account.", at: s(0.4) },
          { text: "A government agency investigates an incident on the same street.", at: s(3.6) },
          { text: "A logistics company routes drivers through it every day.", at: s(6.8) },
          { text: "A resident already knows what happened there last month.", at: s(10.0) },
        ]}
      />
      <div style={{ height: 54 }} />
      <Lead size={52} delay={s(13.4)} color={C.brand} weight={800}>
        None of them can see what the others know.
      </Lead>
    </div>
    <ChapterChip label="The problem" index={0} total={8} />
  </Stage>
);

const Silos: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <FlowDiagram
        title="Today: four records of the same place, four systems"
        nodes={[
          { id: "bank", label: "Bank", sub: "address verification", x: 380, y: 400, at: 0, tone: C.guarded },
          { id: "gov", label: "Government", sub: "incident + case files", x: 760, y: 400, at: 8, tone: C.guarded },
          { id: "biz", label: "Business", sub: "delivery + staff routing", x: 1150, y: 400, at: 16, tone: C.guarded },
          { id: "cit", label: "Citizen", sub: "what actually happened", x: 1535, y: 400, at: 24, tone: C.guarded },
        ]}
        edges={[]}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 560,
          textAlign: "center",
          fontSize: 30,
          fontWeight: 600,
          color: C.faint,
          opacity: interpolate(frame, [s(1.4), s(2.4)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        No lines between them. That is the product gap, not a missing feature.
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 690, textAlign: "center" }}>
        <Lead size={46} delay={s(4.2)} align="center" maxWidth={1500} color={C.text}>
          The risk is the same risk. The data is four copies that never meet.
        </Lead>
      </div>
      <ChapterChip label="The problem" index={0} total={8} />
    </Stage>
  );
};

const Turn: React.FC = () => (
  <Stage>
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 140px" }}>
      <Eyebrow>What OQRAN is</Eyebrow>
      <div style={{ height: 34 }} />
      <Lead size={64} delay={s(0.5)} maxWidth={1560}>
        One spatial risk record per place — written to by everyone who touches it, readable by the others.
      </Lead>
      <div style={{ height: 50 }} />
      <Statements
        size={36}
        gap={20}
        items={[
          { text: "A citizen report raises the risk score a bank sees the next morning.", at: s(4.2) },
          { text: "A bank's fraud signal becomes a case file on a government investigator's queue.", at: s(7.0) },
          { text: "A government danger flag reaches the delivery company routing through it.", at: s(9.8) },
        ]}
      />
    </div>
    <ChapterChip label="The problem" index={0} total={8} />
  </Stage>
);

export const CH0_FRAMES = s(7) + s(17) + s(20) + s(16);

export const Ch0Problem: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={s(7)}>
      <Title />
    </Series.Sequence>
    <Series.Sequence durationInFrames={s(17)}>
      <Problem />
    </Series.Sequence>
    <Series.Sequence durationInFrames={s(20)}>
      <Silos />
    </Series.Sequence>
    <Series.Sequence durationInFrames={s(16)}>
      <Turn />
    </Series.Sequence>
  </Series>
);
