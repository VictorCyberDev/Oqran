# OQRAN submission video

A ~10-minute, no-narration submission film built with [Remotion](https://remotion.dev).
Everything is carried by on-screen text, spotlights on the exact element under
discussion, side-by-side comparisons for each tradeoff, and animated flow
diagrams — so it reads without sound.

Kept in its own package on purpose: the app's dependency tree is not touched.

## Render

```bash
cd video
npm install
npm run render
```

On a machine with no Chrome for Testing installed, point Remotion at a
headless shell you already have:

```bash
npx remotion render Submission out/oqran-submission.mp4 \
  --browser-executable=/path/to/headless_shell
```

## Structure

- `src/theme.ts` — tokens shared with the app, plus `readSec()`, the
  silent-reading timing rule (~2.4 words/second, longer for tradeoffs)
- `src/components/` — `Screen` (footage + spotlight + zoom), `Caption`,
  `SplitCompare` (considered vs built), `FlowDiagram`, `ChapterCard`
- `src/scenes/` — one file per chapter
- `src/clips.ts` — measured clip durations; a Sequence longer than its clip
  renders black, so these are measured rather than estimated
- `public/clips/` — the captured footage

## How the footage was captured

Playwright drove the real production build against a locally seeded database
(`scripts` in the repo root). A synthetic cursor is injected and every
interaction glides to its target, because a silent video gives the viewer no
other way to follow what is being clicked.

Two things about the capture environment are stated in the video itself:

- **Basemap tiles are substituted.** Every tile host returns 403 from the
  recording environment, so a plain coordinate mesh stands in. No street,
  boundary or place geometry was invented. Pins, clustering, search and the
  investigation panel are the real application.
- **The database is a local seed**, not production, and every person and
  address in it is synthetic.
