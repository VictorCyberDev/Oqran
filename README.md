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
3. `npm run db:push` to create the schema on TiDB. **There is no migration history yet** (`prisma/migrations` doesn't exist) — this repo has only ever used `db push`, a manual sync of the live database to whatever `schema.prisma` currently says. It is not run automatically anywhere (not in `postinstall`, not as part of `next build`, not by Vercel). **Every time `schema.prisma` changes, `db push` must be re-run by hand against every database that change needs to reach** — most importantly the exact `DATABASE_URL` your deployed app uses, not just your local one. Forgetting this is why a deployed app can 500 on a table/column that only exists in the schema file. If you want real migration history instead (recommended before this goes further into production use), ask — it's a deliberate switch (`prisma migrate dev` to generate the initial migration, then `prisma migrate deploy` wired into the Vercel build step) rather than something to do silently alongside other fixes.
4. `npm run db:seed` (or `npm run seed`) — see "Seeding" below.
5. `npm run dev`

**Vercel:** `.env` / `.env.example` only affect your local machine — Vercel never reads them. Every variable above must also be added in the Vercel project's own Settings → Environment Variables (separately per Production/Preview/Development, unless you tick "same value for all environments"), and step 3's `db push` must be run with that *same* `DATABASE_URL` before the deployed app can use any schema change.

## Seeding

`npm run seed` / `npm run db:seed` both run `tsx prisma/seed.ts` directly (not through the Prisma CLI), and the script loads `.env` itself via `dotenv/config` — no other setup needed beyond step 2 above. It refuses to run at all if `NODE_ENV=production`.

It's a straight Node script hitting the same `DATABASE_URL` from your `.env`, and every write is an `upsert` keyed by a fixed id/email, so it's safe to run repeatedly — re-running updates the same rows instead of duplicating them (including the per-account activity-log rows, which are keyed the same way for the same reason). It writes to: `Address`, `Incident`, `Organization`, `FraudSignal`, `User`, `Subscription`, `Zone`, and `ActivityLog`. It never touches `OtpCode` or `RateLimitBucket` — those only ever get populated by the app itself at sign-in/OTP time.

It creates: 3 sample addresses/incidents across the three confidence tiers, 3 fraud signals, a Bank/Government/Business demo organization each (with fresh invite codes printed to the console — rotated on every run), 6 demo accounts (`isDemo: true`, one LEAD + one MEMBER per org — sign in with the printed email and the fixed code `000000`), the `admin@oqran.ng` admin account, and the `PLATFORM_OWNER_EMAIL` platform-owner account. Read the console output at the end for the exact demo emails, invite codes, and OTP code — they're also documented above but the seed script is the source of truth if they ever drift.

Because it's a sequence of independent `await`s and not one transaction, a failure partway through (e.g. a dropped connection) can leave later rows missing — safe to just re-run it, since everything upserts.

## Scripts

- `npm run dev` / `build` / `start`
- `npm run lint`
- `npm test` — Vitest, currently covers the ledger hash-chain and Haversine risk-scoring utilities
- `npm run db:push` / `db:migrate` / `db:studio` / `db:seed`

## Structure

- `src/app` — routes, grouped by role (`citizen/`, `bank/`, `gov/`, `business/`,
  `developer/`, `admin/`, shared `account/`) plus `api/` route handlers
- `src/lib` — auth (session/OTP/device-trust), the ledger hash-chain,
  rate limiting, geo/risk scoring, notification providers
- `src/components/ui` — the token-driven component kit (Button, Card, Badge,
  Input, SegmentedControl, Modal, Sheet, Table, MapOverlayPanel)
- `prisma/schema.prisma` — data model; `prisma/seed.ts` — demo data
