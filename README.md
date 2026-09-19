# OQRAN

Nigeria's spatial risk-intelligence platform. Next.js (App Router) + TypeScript,
Tailwind v4, Framer Motion, Prisma against TiDB Cloud, and a custom
JWT/OTP/device-trust auth system (no third-party auth provider). Email is the
only verification channel — phone numbers are collected but never used for OTP.

## Setup

1. `npm install` (runs `prisma generate` via `postinstall` — doesn't need `DATABASE_URL` set yet)
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — a TiDB Cloud Starter connection string. In the TiDB Cloud console, check the cluster's **Networking** tab allows connections from wherever you're running (for Vercel, that's the whole internet — its functions use rotating IPs, so an IP allowlist will silently refuse every deployed connection unless it's set to allow all, or Vercel's IP ranges specifically)
   - `AUTH_JWT_SECRET` — `openssl rand -base64 48`
   - `RESEND_API_KEY` / `EMAIL_FROM` — for real OTP email delivery (optional in dev — without it, OTP codes print to the server console; **required** in production, where sending throws by design instead of silently skipping)
   - `PLATFORM_OWNER_EMAIL` — the single account the seed script grants the `PLATFORM_OWNER` role to; that role is never obtainable any other way
   - `NEXT_PUBLIC_MAP_STYLE_URL` — optional, see `.env.example`
3. Get the schema onto your local database — see "Migrations" below. If this is a database that's never seen OQRAN's schema before, that's just `npx prisma migrate deploy`. If it's an existing local database you previously set up with `db push` (before this repo used migrations), see the one-time baseline step in that section first.
4. `npm run db:seed` (or `npm run seed`) — see "Seeding" below.
5. `npm run dev`

**Vercel:** `.env` / `.env.example` only affect your local machine — Vercel never reads them. Every variable above must also be added in the Vercel project's own Settings → Environment Variables (separately per Production/Preview/Development, unless you tick "same value for all environments").

## Migrations

Schema changes go through real Prisma migration history in `prisma/migrations/`, applied automatically on every deploy — `db push` is no longer part of this project's workflow anywhere.

**Local development, going forward:** edit `prisma/schema.prisma`, then run `npm run db:migrate` (`prisma migrate dev`). It generates a new SQL file under `prisma/migrations/`, applies it to your local database, and regenerates the client. Commit the new migration folder along with the schema change — it's part of the change, not a generated artifact to ignore.

**Production (Vercel):** `npm run build` now runs `prisma migrate deploy && next build`. `migrate deploy` applies any migrations not yet recorded against the environment's `DATABASE_URL` — nothing else runs, no prompts, no schema diffing. So pushing a schema change now reaches production by itself, as part of the same deploy, instead of needing someone to separately remember to run anything by hand. If a migration fails, the build fails — which is the intended behavior: a deploy that would leave code and schema out of sync shouldn't go live.

**One-time baseline required before this reaches production:** the first migration, `prisma/migrations/20260919131417_init/`, represents the schema exactly as it stood under the old `db push` workflow — generated with `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`, not `migrate dev`, specifically because there was no empty database to run `migrate dev` against; the schema was already live. Applying that migration's SQL to a database that already has these tables fails immediately (`Error: P3005 — The database schema is not empty`) — verified directly against a throwaway database while building this out. Any database that already matches the current schema needs to be told it's already there instead:

```
DATABASE_URL="<that database's connection string>" npx prisma migrate resolve --applied 20260919131417_init
```

(the exact folder name is whatever's under `prisma/migrations/` — `resolve --applied` only writes a bookkeeping row recording the migration as done; it runs no SQL and touches no data).

**This step has not been run against this project's real databases yet** — only rehearsed against a disposable local database while building this out, never against real infrastructure. Both this repo's actual local dev database and its actual TiDB production database already have this schema (from the old `db push` workflow) and each need `migrate resolve --applied` run against them, once, before their first `migrate deploy` — including before this branch's next deploy, since `npm run build` now runs `migrate deploy` unconditionally. Skipping this makes the very next build fail with `Error: P3005 — The database schema is not empty`. A brand new, genuinely empty database skips this entirely and just runs `migrate deploy` normally.

## Seeding

`npm run seed` / `npm run db:seed` both run `tsx prisma/seed.ts` directly (not through the Prisma CLI), and the script loads `.env` itself via `dotenv/config` — no other setup needed beyond step 2 above. It refuses to run at all if `NODE_ENV=production`.

It's a straight Node script hitting the same `DATABASE_URL` from your `.env`, and every write is an `upsert` keyed by a fixed id/email, so it's safe to run repeatedly — re-running updates the same rows instead of duplicating them (including the per-account activity-log rows, which are keyed the same way for the same reason). It writes to: `Address`, `Incident`, `Organization`, `FraudSignal`, `User`, `Subscription`, `Zone`, and `ActivityLog`. It never touches `OtpCode` or `RateLimitBucket` — those only ever get populated by the app itself at sign-in/OTP time.

It creates: 3 sample addresses/incidents across the three confidence tiers, 3 fraud signals, a Bank/Government/Business demo organization each (with fresh invite codes printed to the console — rotated on every run), 6 demo accounts (`isDemo: true`, one LEAD + one MEMBER per org — sign in with the printed email and the fixed code `000000`), the `admin@oqran.ng` admin account, and the `PLATFORM_OWNER_EMAIL` platform-owner account. Read the console output at the end for the exact demo emails, invite codes, and OTP code — they're also documented above but the seed script is the source of truth if they ever drift.

Because it's a sequence of independent `await`s and not one transaction, a failure partway through (e.g. a dropped connection) can leave later rows missing — safe to just re-run it, since everything upserts.

## Scripts

- `npm run dev` / `build` / `start` — `build` applies pending migrations (`prisma migrate deploy`) before compiling
- `npm run lint`
- `npm test` — Vitest, currently covers the ledger hash-chain and Haversine risk-scoring utilities
- `npm run db:migrate` — create and apply a new migration locally (`prisma migrate dev`)
- `npm run db:studio` / `db:seed`

## Structure

- `src/app` — routes, grouped by role (`citizen/`, `bank/`, `gov/`, `business/`,
  `developer/`, `admin/`, shared `account/`) plus `api/` route handlers
- `src/lib` — auth (session/OTP/device-trust), the ledger hash-chain,
  rate limiting, geo/risk scoring, notification providers
- `src/components/ui` — the token-driven component kit (Button, Card, Badge,
  Input, SegmentedControl, Modal, Sheet, Table, MapOverlayPanel)
- `prisma/schema.prisma` — data model; `prisma/seed.ts` — demo data
