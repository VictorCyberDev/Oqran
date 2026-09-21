import React from "react";
import { Series } from "remotion";
import { C, FONT, s } from "../theme";
import { Stage, ChapterChip, Lead, Eyebrow, useEnter } from "../components/base";
import { ChapterCard } from "../components/chapter";

const CH = { label: "What went wrong", index: 7 };

/** Three real failures. The log line is shown verbatim because a paraphrase
 * of an error is a claim; the error itself is evidence. */
const Failure: React.FC<{
  n: number;
  headline: string;
  log: string;
  cause: string;
  fix: string;
  learned: string;
}> = ({ n, headline, log, cause, fix, learned }) => {
  const head = useEnter(s(0.2), 16);
  const logE = useEnter(s(2.4), 12);
  const causeE = useEnter(s(5.0), 12);
  const fixE = useEnter(s(8.2), 12);
  const learnE = useEnter(s(11.4), 12);

  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, padding: "104px 130px 0", fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: C.critical }}>
            FAILURE {n} OF 3
          </span>
        </div>
        <div style={{ height: 22 }} />
        <div style={{ ...head, fontSize: 54, fontWeight: 700, color: C.text, letterSpacing: "-0.02em", maxWidth: 1560, lineHeight: 1.16 }}>
          {headline}
        </div>

        <div
          style={{
            ...logE,
            marginTop: 38,
            background: "#0a0b0f",
            border: `1px solid ${C.critical}55`,
            borderLeft: `5px solid ${C.critical}`,
            borderRadius: 14,
            padding: "22px 28px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: 26,
            lineHeight: 1.45,
            color: "#ff9aa6",
            maxWidth: 1560,
          }}
        >
          {log}
        </div>

        <Row label="What was actually wrong" text={cause} style={causeE} tone={C.guarded} top={34} />
        <Row label="The fix" text={fix} style={fixE} tone={C.brand} top={22} />
        <Row label="What it changed about how we work" text={learned} style={learnE} tone={C.low} top={22} />
      </div>
      <ChapterChip {...CH} total={8} />
    </Stage>
  );
};

const Row: React.FC<{
  label: string;
  text: string;
  style: React.CSSProperties;
  tone: string;
  top: number;
}> = ({ label, text, style, tone, top }) => (
  <div style={{ ...style, marginTop: top, display: "flex", gap: 26, maxWidth: 1620 }}>
    <div
      style={{
        width: 300,
        flex: "0 0 auto",
        fontSize: 19,
        fontWeight: 800,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: tone,
        paddingTop: 7,
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 31, lineHeight: 1.44, fontWeight: 500, color: C.text }}>{text}</div>
  </div>
);

export const CH7_FRAMES = s(6) + s(16) + s(16) + s(16) + s(9);

export const Ch7Failures: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={s(6)}>
      <Stage>
        <ChapterCard
          index={7}
          total={8}
          timecode="What went wrong"
          title="Three things that broke"
          blurb="All three cost hours. All three changed something about how the rest of the build was verified."
        />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(16)}>
      <Failure
        n={1}
        headline="Account creation started failing on a database with almost no traffic"
        log="Error: Too many connections"
        cause="The MariaDB driver's pool defaults to 10 connections and keeps them open. Every warm serverless instance is a separate process with its own pool, so a handful of idle instances were sitting on more connections than TiDB Cloud Starter allows — while barely serving requests."
        fix="Cap the pool per process: connectionLimit=3 injected into the connection URL, so each instance holds as few as it can. A globalThis singleton helps within one process, but it cannot dedupe across containers — that was the tempting wrong fix."
        learned="Serverless breaks 'one process, one pool'. The number that matters is connections x instances, and only one of those two is under your control."
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(16)}>
      <Failure
        n={2}
        headline="Migrations failed on deploy while the exact same URL worked fine at runtime"
        log='Error: Connections using insecure transport are prohibited while --require_secure_transport=ON'
        cause="Prisma has two clients. The app talks to TiDB through a JS driver adapter, which reads ssl=true. `prisma migrate deploy` uses Prisma's own Rust schema engine, which does not — it needs sslaccept=strict. One connection string, two parsers."
        fix="prisma7.config.ts rewrites the URL for the CLI: if ssl is set and sslaccept is not, add sslaccept=strict."
        learned="'It works locally' meant nothing here, because locally there was no TLS. Migrations are now rehearsed against a populated database before they are committed."
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(16)}>
      <Failure
        n={3}
        headline="The offline queue was finished, and would have quietly duplicated every escalation"
        log="// queued write → POST succeeded → response lost → reconnect → POST again"
        cause="The hard part of a write queue is not storing the request. A queued write may have already reached the server with only the reply lost. Replaying it turns one escalation into two cases — and nothing surfaces the error."
        fix="A client-generated clientRequestId on every queued write, UNIQUE in the database, so a replay returns the original row instead of creating a second one."
        learned="We stopped trusting 'the request failed' to mean 'nothing happened'. Retries are now designed around what the server may already have done."
      />
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(9)}>
      <Stage>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 140px" }}>
          <Eyebrow color={C.low}>The pattern</Eyebrow>
          <div style={{ height: 30 }} />
          <Lead size={56} delay={s(0.4)} maxWidth={1560}>
            All three were invisible in tests and obvious in production.
          </Lead>
          <div style={{ height: 36 }} />
          <Lead size={36} delay={s(3.6)} weight={600} color={C.muted} maxWidth={1500}>
            Type-checks and unit tests passed the whole time. What caught them was running the real thing against a
            real database, and reading the log instead of guessing.
          </Lead>
        </div>
        <ChapterChip {...CH} total={8} />
      </Stage>
    </Series.Sequence>
  </Series>
);
