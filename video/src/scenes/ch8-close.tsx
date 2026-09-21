import React from "react";
import { Series, interpolate, useCurrentFrame } from "remotion";
import { C, s } from "../theme";
import { Stage, ChapterChip, Lead, Eyebrow, Body } from "../components/base";
import { ChapterCard } from "../components/chapter";
import { DisclosureTable, Statements } from "../components/list";

const CH = { label: "Real vs simulated", index: 8 };

export const CH8_FRAMES = s(5) + s(15) + s(10) + s(11) + s(8);

export const Ch8Close: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={s(5)}>
      <Stage>
        <ChapterCard
          index={8}
          total={8}
          timecode="Disclosure"
          title="What is real, and what is simulated"
          blurb="Stated in full, because a reviewer should not have to work it out from the UI."
        />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(15)}>
      <Stage>
        <div style={{ position: "absolute", inset: 0, padding: "92px 110px 0" }}>
          <Eyebrow color={C.low}>Running on real infrastructure</Eyebrow>
          <div style={{ height: 26 }} />
          <DisclosureTable
            rows={[
              { label: "Accounts, sessions, device trust", value: "Real auth: JWT sessions, bcrypt-hashed codes, PIN-bound devices", real: true, at: s(0.4) },
              { label: "Database", value: "Real TiDB Cloud, real Prisma migrations applied on deploy", real: true, at: s(1.3) },
              { label: "Incidents, cases, notes, escalations", value: "Real rows, written by the flows shown in this video", real: true, at: s(2.2) },
              { label: "Risk scoring", value: "Real Haversine proximity scoring over recorded incidents", real: true, at: s(3.1) },
              { label: "Audit ledger", value: "Real SHA-256 hash chain, verified on export", real: true, at: s(4.0) },
              { label: "Offline queue and replay", value: "Real IndexedDB queue and service worker, tested with the network cut", real: true, at: s(4.9) },
              { label: "Rate limiting, SLA timers, anomaly detection", value: "Real, computed from the database", real: true, at: s(5.8) },
            ]}
          />
        </div>
        <ChapterChip {...CH} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(10)}>
      <Stage>
        <div style={{ position: "absolute", inset: 0, padding: "104px 110px 0" }}>
          <Eyebrow color={C.guarded}>Simulated — and labelled in the product, not just here</Eyebrow>
          <div style={{ height: 26 }} />
          <DisclosureTable
            rows={[
              { label: "NIN identity cross-reference", value: "Deterministic from SHA-256 of the NIN — pending NIMC API access", real: false, at: s(0.4) },
              { label: "Cross-institution activity counts", value: "Pending inter-bank data-sharing agreements", real: false, at: s(1.4) },
              { label: "CBN/NIBSS watchlist matches", value: "Synthetic references — pending regulator data access", real: false, at: s(2.4) },
              { label: "All seeded people and addresses", value: "Synthetic. No real personal data anywhere in the system", real: false, at: s(3.4) },
              { label: "Basemap tiles in this recording", value: "Substituted — the tile provider is blocked from the capture environment", real: false, at: s(4.4) },
            ]}
          />
          <div style={{ height: 34 }} />
          <Body delay={s(6.0)} size={30} maxWidth={1600}>
            Every simulated value is derived, never randomised: the same input returns the same result, so the
            behaviour can be tested and a reviewer can check it twice.
          </Body>
        </div>
        <ChapterChip {...CH} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(11)}>
      <Stage>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 140px" }}>
          <Eyebrow>If this continued past the hackathon</Eyebrow>
          <div style={{ height: 32 }} />
          <Statements
            size={36}
            gap={20}
            items={[
              { text: "Replace the NIN simulation with the real NIMC call — the interface is already the right shape.", at: s(0.4) },
              { text: "One real bank on the escalation flow, because the cross-institution signal only works with participants.", at: s(2.8) },
              { text: "Self-host the tile and geocoding stack so coverage of informal addresses stops being a dependency.", at: s(5.2) },
              { text: "Field-test the offline queue on an actual degraded network, not a simulated one.", at: s(7.6), tone: C.guarded },
            ]}
          />
        </div>
        <ChapterChip {...CH} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Outro />
    </Series.Sequence>
  </Series>
);

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const rule = interpolate(frame, [14, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Lead size={104} delay={0} align="center" weight={800}>
          OQRAN
        </Lead>
        <div style={{ height: 3, background: C.brand, width: `${rule * 260}px`, margin: "28px 0 30px", borderRadius: 2 }} />
        <Lead size={40} delay={16} align="center" weight={600} color={C.muted} maxWidth={1300}>
          Verify. Assess. Protect.
        </Lead>
        <div style={{ height: 28 }} />
        <Body delay={34} size={28} color={C.faint} maxWidth={1200}>
          <span style={{ display: "block", textAlign: "center" }}>
            Every screen in this video is the running application, captured live.
          </span>
        </Body>
      </div>
    </Stage>
  );
};
