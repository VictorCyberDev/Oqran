import React from "react";
import { Series } from "remotion";
import { s } from "../theme";
import { Stage, ChapterChip } from "../components/base";
import { ChapterCard } from "../components/chapter";
import { Screen, Caption } from "../components/screen";
import { CLIP, col } from "../clips";

/* ============================== BANK ============================== */
export const CH3_FRAMES = s(6) + s(8) + s(8) + s(9) + s(7);

export const Ch3Bank: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={s(6)}>
      <Stage>
        <ChapterCard
          index={3}
          total={8}
          timecode="Bank"
          title="The compliance desk"
          blurb="Address and identity risk a bank's own records cannot show it, on a clock it is measured against."
        />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Stage>
        <Screen
          src={CLIP.bankDesk.file}
          trimBefore={s(1)}
          spotlight={col(268, 230)}
          spotlightFrom={s(1.5)}
          spotlightLabel="Open signals · past SLA"
          />
        <Caption title="Bank" delay={6} width={940}>
          A compliance officer is measured on a 30-minute response window. The desk opens on what has already breached it.
        </Caption>
        <ChapterChip label="Bank" index={3} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Stage>
        <Screen
          src={CLIP.bankDesk.file}
          trimBefore={s(12)}
          zoom={1.45}
          focus={col(234, 152)}
          spotlight={col(234, 152)}
          spotlightFrom={s(1.2)}
          spotlightLabel="Simulated — pending NIMC API access"
        />
        <Caption title="Identity cross-reference" delay={6} width={900} where="bottom-right">
          The same NIN check the investigator has, on the bank side — and labelled the same way.
        </Caption>
        <ChapterChip label="Bank" index={3} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(9)}>
      <Stage>
        <Screen
          src={CLIP.bankDesk.file}
          trimBefore={s(21)}
          zoom={1.25}
          focus={col(318, 268)}
          spotlight={col(318, 268)}
          spotlightFrom={s(1.4)}
          spotlightLabel="Who else is checking this address"
        />
        <Caption title="The signal one bank cannot generate alone" delay={6} width={1020}>
          Five verification attempts on one address in 24 hours, from two institutions. No single bank can see this
          about itself — it only exists because more than one participates.
        </Caption>
        <ChapterChip label="Bank" index={3} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(7)}>
      <Stage>
        <Screen
          src={CLIP.bankDesk.file}
          trimBefore={s(31)}
          spotlight={col(945, 118)}
          spotlightFrom={s(0.8)}
          spotlightLabel="Watchlist match · SLA countdown"
        />
        <Caption title="Fraud signal feed" delay={6} width={940}>
          Each signal carries its severity, its watchlist status and how long is left on the clock.
        </Caption>
        <ChapterChip label="Bank" index={3} total={8} />
      </Stage>
    </Series.Sequence>
  </Series>
);

/* ==================== BUSINESS + PLATFORM OWNER ==================== */
export const CH4_FRAMES = s(6) + s(8) + s(9) + s(7) + s(8);

export const Ch4BusinessOwner: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={s(6)}>
      <Stage>
        <ChapterCard
          index={4}
          total={8}
          timecode="Business & Platform"
          title="Everyone else who routes people"
          blurb="Logistics, field staff and the operator keeping the platform itself honest."
        />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Stage>
        <Screen src={CLIP.business.file} trimBefore={s(4)} />
        <Caption title="Business" delay={6} width={960}>
          A logistics operator watches zones, not addresses. Adding one takes a name and a street — no GIS upload,
          no coordinates to look up.
        </Caption>
        <ChapterChip label="Business" index={4} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(9)}>
      <Stage>
        <Screen
          src={CLIP.business.file}
          trimBefore={s(25)}
          zoom={1.3}
          focus={col(180, 380)}
          spotlight={col(190, 220)}
          spotlightFrom={s(1.6)}
          spotlightLabel="Written for a dispatcher, not an analyst"
        />
        <Caption title="Plain-language risk" delay={6} width={980} where="bottom-right">
          &ldquo;No incidents reported here in the past 30 days.&rdquo; The person reading this is deciding a route in
          ten seconds, not reading a chart.
        </Caption>
        <ChapterChip label="Business" index={4} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(7)}>
      <Stage>
        <Screen src={CLIP.owner.file} trimBefore={s(3)} />
        <Caption title="Platform Owner" delay={6} width={980}>
          The operator's own view: anomaly watch, rate-limit hotspots, fraud SLA across every bank, address data
          quality. All real data — nothing simulated on this screen.
        </Caption>
        <ChapterChip label="Platform" index={4} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Stage>
        <Screen src={CLIP.owner.file} trimBefore={s(16)} />
        <Caption title="Audit ledger" delay={6} width={980} where="bottom-right">
          Every incident, case and status change is hash-chained. The export verifies the chain, so a regulator can
          check the record has not been edited after the fact.
        </Caption>
        <ChapterChip label="Platform" index={4} total={8} />
      </Stage>
    </Series.Sequence>
  </Series>
);
