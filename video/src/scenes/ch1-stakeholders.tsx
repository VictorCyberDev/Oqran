import React from "react";
import { Series } from "remotion";
import { C, s } from "../theme";
import { Stage, ChapterChip } from "../components/base";
import { ChapterCard } from "../components/chapter";
import { Screen, Caption } from "../components/screen";
import { CLIP, col } from "../clips";

/** Footage with a caption and, where the caption names a thing, a
 * spotlight on that exact thing at that exact moment. */
const Shot: React.FC<{
  clip: keyof typeof CLIP;
  trimBefore?: number;
  zoom?: number;
  focus?: { x: number; y: number; w: number; h: number };
  spotlight?: { x: number; y: number; w: number; h: number } | null;
  spotlightFrom?: number;
  spotlightLabel?: string;
  chapter: { label: string; index: number };
  caption: React.ReactNode;
  captionTitle?: string;
  where?: "bottom" | "top-right" | "bottom-right" | "top-left";
  captionDelay?: number;
  width?: number;
}> = ({
  clip,
  trimBefore,
  zoom,
  focus,
  spotlight,
  spotlightFrom = 0,
  spotlightLabel,
  chapter,
  caption,
  captionTitle,
  where = "bottom",
  captionDelay = 6,
  width,
}) => (
  <Stage>
    <Screen
      src={CLIP[clip].file}
      trimBefore={trimBefore}
      zoom={zoom}
      focus={focus}
      spotlight={spotlight ?? null}
      spotlightFrom={spotlightFrom}
      spotlightLabel={spotlightLabel}
    />
    <Caption title={captionTitle} delay={captionDelay} where={where} width={width}>
      {caption}
    </Caption>
    <ChapterChip label={chapter.label} index={chapter.index} total={8} />
  </Stage>
);

/* ============================= CITIZEN ============================= */
export const CH1_FRAMES = s(6) + s(9) + s(7) + s(8) + s(7) + s(8);

export const Ch1Citizen: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={s(6)}>
      <Stage>
        <ChapterCard
          index={1}
          total={8}
          timecode="Citizen"
          title="The person who already knows"
          blurb="Residents hold the earliest, most accurate signal about a place — and historically the fewest ways to record it."
        />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(9)}>
      <Shot
        clip="citizenHome"
        trimBefore={s(1)}
        chapter={{ label: "Citizen", index: 1 }}
        captionTitle="Why this screen exists"
        spotlight={col(323, 140)}
        spotlightFrom={s(1.4)}
        spotlightLabel="Saved place · risk changed since you added it"
        caption={<>A citizen&rsquo;s saved places are watched for them. &ldquo;Home&rdquo; moved from Low to Elevated — they didn&rsquo;t have to go looking.</>}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(7)}>
      <Shot
        clip="citizenHome"
        trimBefore={s(14)}
        chapter={{ label: "Citizen", index: 1 }}
        zoom={1.35}
        focus={col(318, 320)}
        spotlight={{ x: 660, y: 390, w: 600, h: 40 }}
        spotlightFrom={s(1.6)}
        spotlightLabel="Did my report change anything?"
        captionTitle="The retention problem"
        caption={<>Reporting systems die when nothing visibly happens. This shows the person what their report actually changed.</>}
        where="bottom"
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Shot
        clip="street"
        trimBefore={s(4)}
        chapter={{ label: "Citizen", index: 1 }}
        captionTitle="Check a place before you go"
        caption={<>Any street, not just a saved one — a marketplace meetup, a flat viewing, a delivery address.</>}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(7)}>
      <Shot
        clip="street"
        trimBefore={s(13)}
        chapter={{ label: "Citizen", index: 1 }}
        zoom={1.3}
        focus={col(300, 400)}
        spotlight={{ x: 660, y: 328, w: 600, h: 78 }}
        spotlightFrom={s(1.8)}
        spotlightLabel="The answer, in a sentence"
        captionTitle="Plain language, not a score"
        caption={<>A number nobody can act on is worse than a sentence they can. The risk band leads; the score supports it.</>}
        where="bottom-right"
        width={780}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Shot
        clip="incident"
        trimBefore={s(4)}
        chapter={{ label: "Citizen", index: 1 }}
        captionTitle="Under 30 seconds"
        caption={<>Category, optional detail, location. Every extra field is a report that never gets filed.</>}
      />
    </Series.Sequence>
  </Series>
);

/* =========================== GOVERNMENT =========================== */
export const CH2_FRAMES = s(6) + s(8) + s(9) + s(9) + s(8) + s(6);

export const Ch2Government: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={s(6)}>
      <Stage>
        <ChapterCard
          index={2}
          total={8}
          timecode="Government"
          title="The investigator's map"
          blurb="Everything reported by anyone, on one national surface — searchable, and workable as cases."
        />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Stage>
        <Screen src={CLIP.govInvest.file} spotlight={{ x: 20, y: 62, w: 1880, h: 74 }} spotlightFrom={s(1.6)} spotlightLabel="Everything waiting, and where it came from" />
        <Caption title="Government" delay={6} width={980}>
          Three open cases: one escalated by a bank, the rest citizen reports and investigator flags — in a single queue.
        </Caption>
        <BasemapNote />
        <ChapterChip label="Government" index={2} total={8} />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(9)}>
      <Shot
        clip="govInvest"
        trimBefore={s(8)}
        chapter={{ label: "Government", index: 2 }}
        captionTitle="Search, then investigate"
        caption={<>An investigator types a street. OQRAN checks its own address records first, and only then a public geocoder.</>}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(9)}>
      <Shot
        clip="govInvest"
        trimBefore={s(15)}
        chapter={{ label: "Government", index: 2 }}
        zoom={1.5}
        focus={{ x: 1262, y: 210, w: 320, h: 340 }}
        spotlight={{ x: 1276, y: 258, w: 292, h: 62 }}
        spotlightFrom={s(1.8)}
        spotlightLabel="Confidence tier — where this address came from"
        captionTitle="Provenance is part of the answer"
        caption={<>NIMC-certified, state GIS-verified or crowd-reported. An investigator needs to know how much to trust the record.</>}
        where="bottom"
        width={900}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Shot
        clip="govInvest"
        trimBefore={s(20)}
        chapter={{ label: "Government", index: 2 }}
        zoom={1.5}
        focus={{ x: 1262, y: 300, w: 320, h: 300 }}
        spotlight={{ x: 1276, y: 336, w: 292, h: 34 }}
        spotlightFrom={s(0.8)}
        spotlightLabel="Labelled Simulated, every time it appears"
        captionTitle="NIN cross-reference"
        caption={<>A live NIMC lookup needs access we don&rsquo;t have. Rather than hide that, the label is part of the component.</>}
        width={900}
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(6)}>
      <Shot
        clip="govInvest"
        trimBefore={s(24)}
        chapter={{ label: "Government", index: 2 }}
        zoom={1.5}
        focus={{ x: 1262, y: 380, w: 320, h: 260 }}
        spotlight={{ x: 1290, y: 455, w: 262, h: 58 }}
        spotlightFrom={s(0.6)}
        spotlightLabel="Flag as dangerous for civilians"
        captionTitle="A flag is work, not a label"
        caption={<>Flagging opens a case, writes to the audit ledger, and reaches every citizen checking that street.</>}
        width={880}
      />
    </Series.Sequence>
  </Series>
);

/** Said plainly and early, because the map is the one thing on screen that
 * is not what a real deployment shows. */
const BasemapNote: React.FC = () => (
  <div
    style={{
      position: "absolute",
      right: 56,
      bottom: 46,
      maxWidth: 560,
      fontSize: 19,
      lineHeight: 1.45,
      fontWeight: 600,
      color: C.faint,
      background: "rgba(14,16,22,0.9)",
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: "14px 18px",
      zIndex: 55,
    }}
  >
    <span style={{ color: C.guarded }}>Basemap substituted for this recording.</span> The tile
    provider is blocked from the capture environment, so a plain coordinate mesh stands in. Pins,
    clustering, search and the panel are real.
  </div>
);
