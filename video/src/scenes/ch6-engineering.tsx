import React from "react";
import { Series } from "remotion";
import { C, s } from "../theme";
import { Stage, ChapterChip, Lead, Eyebrow, Body } from "../components/base";
import { ChapterCard } from "../components/chapter";
import { Screen, Caption } from "../components/screen";
import { SplitCompare } from "../components/compare";
import { FlowDiagram } from "../components/flow";
import { Statements } from "../components/list";
import { CLIP, col } from "../clips";

const CH = { label: "Engineering decisions", index: 6 };
const Chip = () => <ChapterChip {...CH} total={8} />;

export const CH6_FRAMES =
  s(7) + s(13) + s(13) + s(12) + s(12) + s(10) +
  s(8) + s(8) + s(8) + s(7) +
  s(12) + s(11) +
  s(7) + s(8) + s(11) + s(8) + s(8) +
  s(12);

export const Ch6Engineering: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={s(7)}>
      <Stage>
        <ChapterCard
          index={6}
          total={8}
          timecode="Engineering decisions"
          title="What we chose, and what we turned down"
          blurb="Every panel on the left is an option that was actually on the table."
        />
      </Stage>
    </Series.Sequence>

    {/* ---------------- offline: the read/write split ---------------- */}
    <Series.Sequence durationInFrames={s(13)}>
      <Stage>
        <FlowDiagram
          title="Offline: the rule that decides everything"
          nodes={[
            { id: "act", label: "You do something", sub: "with no connection", x: 330, y: 400, at: 0, tone: C.brand, w: 330 },
            { id: "write", label: "A write", sub: "report · note · escalation", x: 960, y: 250, at: 18, tone: C.low, w: 350 },
            { id: "read", label: "A live answer", sub: "address · NIN · risk score", x: 960, y: 560, at: 32, tone: C.guarded, w: 350 },
            { id: "queue", label: "Held on device", sub: "sends on reconnect", x: 1590, y: 250, at: 48, tone: C.low, w: 330 },
            { id: "fail", label: "Fails loudly", sub: "no stale answer", x: 1590, y: 560, at: 62, tone: C.guarded, w: 330 },
          ]}
          edges={[
            { from: "act", to: "write", at: 12, tone: C.low },
            { from: "act", to: "read", at: 26, tone: C.guarded },
            { from: "write", to: "queue", at: 42, tone: C.low },
            { from: "read", to: "fail", at: 56, tone: C.guarded },
          ]}
          caption="A write whose result you don't need this second is queued. Everything else fails loudly."
        />
        <Chip />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(13)}>
      <Stage>
        <SplitCompare
          question="Should dashboards work offline too?"
          verdictAt={s(6.5)}
          rejected={{
            title: "Cache the full dashboard",
            points: [
              "Every screen keeps working with no connection",
              "Looks the most impressive in a demo",
              "A stale risk score is indistinguishable from a live one",
              "On a shared branch device, the next person sees the last person's data",
            ],
            verdict: "Rejected — a stale number read as current is worse than no number",
          }}
          built={{
            title: "Cache the app shell, queue the writes",
            points: [
              "Only content-hashed build assets are cached",
              "Authenticated HTML is never stored",
              "Writes are held in IndexedDB and replayed on reconnect",
              "A page never opened falls back to a static page holding nobody's data",
            ],
            verdict: "Built — verified in a real browser with the network cut",
          }}
        />
        <Chip />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(12)}>
      <Stage>
        <SplitCompare
          question="Should the Owner and Admin dashboards be cached?"
          verdictAt={s(6)}
          rejected={{
            title: "Cache them like any other screen",
            points: [
              "Consistent behaviour across all roles",
              "Oversight data is the most valuable to have offline",
              "But: rate limits, anomaly flags and SLA breaches change by the minute",
              "A stale all-clear on a live attack is a false negative, not a stale number",
            ],
            verdict: "Rejected — these screens exist to catch what is happening now",
          }}
          built={{
            title: "Deliberately excluded",
            points: [
              "/owner and /admin/* require a live connection",
              "Stated in docs/OFFLINE.md, not just left as behaviour",
              "The rest of the platform still degrades gracefully",
            ],
            verdict: "Built — the one place where failing is the safer default",
          }}
        />
        <Chip />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(12)}>
      <Stage>
        <SplitCompare
          question="How do we stop a reconnect filing the same report twice?"
          verdictAt={s(6)}
          rejected={{
            title: "Retry, and de-duplicate later",
            points: [
              "Simplest thing that works most of the time",
              "A queued write may have already reached the server with only the reply lost",
              "One escalation silently becomes two cases",
              "Two investigators are then dispatched to one address",
            ],
            verdict: "Rejected — the failure is invisible until it wastes someone's day",
          }}
          built={{
            title: "A client-generated idempotency key",
            points: [
              "Every queued write carries a clientRequestId",
              "UNIQUE on incidents, cases and case_notes",
              "A replay returns the original result instead of creating a second row",
              "Enforced by the database, not by application timing",
            ],
            verdict: "Built — proven in a browser: one request, one row, on replay",
          }}
        />
        <Chip />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(10)}>
      <Stage>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 140px" }}>
          <Eyebrow>What got priority, and why</Eyebrow>
          <div style={{ height: 30 }} />
          <Lead size={52} delay={s(0.4)} maxWidth={1560}>
            The citizen incident report was queued first, before any other write.
          </Lead>
          <div style={{ height: 38 }} />
          <Statements
            size={34}
            gap={18}
            items={[
              { text: "A bank officer who loses connection tries again in a minute.", at: s(3.2), tone: C.guarded },
              { text: "Someone reporting an incident during a power cut does not come back.", at: s(6.0), tone: C.brand },
            ]}
          />
        </div>
        <Chip />
      </Stage>
    </Series.Sequence>

    {/* ---------------- offline footage ---------------- */}
    <Series.Sequence durationInFrames={s(8)}>
      <Stage>
        <Screen src={CLIP.offline.file} trimBefore={s(4)} spotlight={{ x: 400, y: 0, w: 1120, h: 34 }} spotlightFrom={s(2.0)} spotlightLabel="Connection lost" />
        <Caption title="Real footage — network cut mid-session" delay={6} width={980}>
          The banner is deliberate. Someone filing a report during a power cut needs to know whether it left the device.
        </Caption>
        <Chip />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Stage>
        <Screen src={CLIP.offline.file} trimBefore={s(16)} zoom={1.3} focus={col(100, 340)} spotlight={{ x: 400, y: 0, w: 1120, h: 34 }} spotlightFrom={s(1.4)} spotlightLabel="1 change saved on this device" />
        <Caption title="Accepted, not pretended" delay={6} width={1000} where="bottom-right">
          &ldquo;Saved — will submit when back online.&rdquo; It never claims the report was filed.
        </Caption>
        <Chip />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Stage>
        <Screen src={CLIP.offline.file} trimBefore={s(23)} />
        <Caption title="A page never opened on this device" delay={6} width={1000}>
          The service worker serves a static fallback holding nobody&rsquo;s data — not a browser error, and not
          somebody else&rsquo;s cached dashboard.
        </Caption>
        <Chip />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(7)}>
      <Stage>
        <Screen src={CLIP.offline.file} trimBefore={s(27.3)} spotlight={{ x: 400, y: 0, w: 1120, h: 34 }} spotlightFrom={s(0.8)} spotlightLabel="1 saved change sent" />
        <Caption title="Reconnect — the app drains its own queue" delay={6} width={1000}>
          No button was pressed. The queue belongs to the app, not to whichever screen happens to be open.
        </Caption>
        <Chip />
      </Stage>
    </Series.Sequence>

    {/* ---------------- NIN simulation ---------------- */}
    <Series.Sequence durationInFrames={s(12)}>
      <Stage>
        <SplitCompare
          question="The NIN cross-reference: how do you demo an API you cannot access?"
          verdictAt={s(6)}
          rejected={{
            title: "Randomised mock results",
            points: [
              "Quick to write, looks alive in a demo",
              "The same NIN returns a different answer each time",
              "A reviewer who checks twice catches it immediately",
              "Nothing built on top of it can be tested",
            ],
            verdict: "Rejected — theatre, and fragile theatre at that",
          }}
          built={{
            title: "Deterministic simulation, labelled everywhere",
            points: [
              "Derived by SHA-256 of the NIN — same input, same result, always",
              "Matched / no-match / watchlist in fixed proportions",
              "Pseudonymous references (NG-CIT-4F2A91), never invented names",
              "“Simulated — pending NIMC API access” ships with the component",
            ],
            verdict: "Built — swap in the real NIMC call and nothing else changes",
          }}
        />
        <Chip />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(11)}>
      <Stage>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 140px" }}>
          <Eyebrow>The hackathon rule this satisfies</Eyebrow>
          <div style={{ height: 30 }} />
          <Lead size={50} delay={s(0.4)} maxWidth={1520}>
            &ldquo;No real personal data — synthetic or simulated only, and state the provenance.&rdquo;
          </Lead>
          <div style={{ height: 40 }} />
          <Body delay={s(4.0)} size={34} maxWidth={1460}>
            So the label is not a disclaimer in a footer. It is rendered next to the result, every time, by the same
            component that renders the result.
          </Body>
        </div>
        <Chip />
      </Stage>
    </Series.Sequence>

    {/* ---------------- account creation + device trust ---------------- */}
    <Series.Sequence durationInFrames={s(7)}>
      <Stage>
        <Screen src={CLIP.createAcct.file} trimBefore={s(1)} />
        <Caption title="Creating an account" delay={6} width={660}>
          The role you pick is not a preference — it decides what you can see. Two of the five cannot be
          self-served at all.
        </Caption>
        <Chip />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Stage>
        <Screen
          src={CLIP.createAcct.file}
          trimBefore={s(13)}
          zoom={1.35}
          focus={{ x: 700, y: 280, w: 520, h: 500 }}
          spotlight={{ x: 766, y: 655, w: 392, h: 54 }}
          spotlightFrom={s(2.2)}
          spotlightLabel="Whoever asks first becomes the org's lead"
        />
        <Caption title="The tradeoff we accepted here" delay={6} width={620} where="top-left">
          Bank and Government accounts need an invite code or a reviewed work email. It adds friction to
          onboarding — and it is the only thing stopping anyone claiming an investigator&rsquo;s view of the map.
        </Caption>
        <Chip />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(11)}>
      <Stage>
        <FlowDiagram
          title="Sign-in: one code per device, not one per login"
          nodes={[
            { id: "new", label: "New device", sub: "never seen before", x: 330, y: 380, at: 0, tone: C.brand, w: 320 },
            { id: "otp", label: "Emailed code", sub: "proves the account", x: 870, y: 380, at: 16, tone: C.brand, w: 320 },
            { id: "pin", label: "Device trusted", sub: "PIN set, bound to this browser", x: 1450, y: 380, at: 34, tone: C.low, w: 360 },
            { id: "again", label: "Next sign-in here", sub: "PIN only — no new code", x: 1450, y: 680, at: 56, tone: C.low, w: 360 },
            { id: "other", label: "A different device", sub: "back to an emailed code", x: 640, y: 680, at: 74, tone: C.guarded, w: 360 },
          ]}
          edges={[
            { from: "new", to: "otp", at: 10, tone: C.brand },
            { from: "otp", to: "pin", at: 28, tone: C.brand },
            { from: "pin", to: "again", at: 50, tone: C.low, side: "v" },
            { from: "again", to: "other", at: 68, tone: C.guarded },
          ]}
          caption="The second factor moves to the device instead of being re-sent every session."
        />
        <Chip />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Stage>
        <Screen src={CLIP.authFirst.file} trimBefore={s(8)} />
        <Caption title="Real footage — first sign-in on a new device" delay={6} width={1000}>
          One emailed code, then a PIN that is bound to this browser. The code proves the account; the PIN
          proves the device.
        </Caption>
        <Chip />
      </Stage>
    </Series.Sequence>

    <Series.Sequence durationInFrames={s(8)}>
      <Stage>
        <Screen src={CLIP.authReturn.file} trimBefore={s(15)} />
        <Caption title="Real footage — returning to that device" delay={6} width={1000}>
          No new code. Emailed codes over an unreliable mobile network are exactly where people give up on
          signing in.
        </Caption>
        <Chip />
      </Stage>
    </Series.Sequence>

    {/* ---------------- map stack ---------------- */}
    <Series.Sequence durationInFrames={s(12)}>
      <Stage>
        <SplitCompare
          question="Mapping and geocoding: Google, or the open stack?"
          verdictAt={s(6)}
          rejected={{
            title: "Google Maps Platform",
            points: [
              "Best-in-class Nigerian street and place coverage",
              "One SDK, no fallback logic to write",
              "Per-request billing on a government-scale dataset",
              "A key, a billing account and a vendor dependency before anyone can self-host",
            ],
            verdict: "Rejected — cost and lock-in for a public-sector platform",
          }}
          built={{
            title: "MapLibre + OSM, own records first",
            points: [
              "No API key, and the whole stack can be self-hosted",
              "OQRAN searches its own address records before any geocoder",
              "Nominatim first, Photon as a fallback",
              "Honest failure: “no result” and “geocoder unreachable” are different messages",
            ],
            verdict: "Built — with a real limitation, stated next",
          }}
        />
        <Chip />
      </Stage>
    </Series.Sequence>
  </Series>
);

/** The limitation that belongs with the map decision, given its own beat
 * so it is not buried in a bullet. */
export const MapLimitation: React.FC = () => (
  <Stage>
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 140px" }}>
      <Eyebrow color={C.guarded}>The limitation, stated</Eyebrow>
      <div style={{ height: 30 }} />
      <Lead size={50} delay={s(0.4)} maxWidth={1560}>
        OpenStreetMap coverage of informal Nigerian addresses is materially worse than Google&rsquo;s.
      </Lead>
      <div style={{ height: 38 }} />
      <Statements
        size={32}
        gap={18}
        items={[
          { text: "Unnamed streets and new developments often return nothing at all.", at: s(3.4), tone: C.guarded },
          { text: "Nominatim's public instance rate-limits hard, which is why Photon backs it up.", at: s(6.0), tone: C.guarded },
          { text: "Partly mitigated: OQRAN's own address records are searched first, and they grow with use.", at: s(8.6), tone: C.brand },
        ]}
      />
    </div>
    <ChapterChip label="Engineering decisions" index={6} total={8} />
  </Stage>
);
