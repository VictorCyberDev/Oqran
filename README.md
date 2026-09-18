# OQRAN

Nigeria's spatial risk-intelligence platform. Next.js (App Router) + TypeScript,
Tailwind v4, Framer Motion, Prisma against TiDB Cloud, and a custom
JWT/OTP/device-trust auth system (no third-party auth provider). Email is the
only verification channel — phone numbers are collected but never used for OTP.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — a TiDB Cloud Starter connection string
   - `AUTH_JWT_SECRET` — `openssl rand -base64 48`
   - `RESEND_API_KEY` / `EMAIL_FROM` — for real OTP email delivery (optional in dev — without it, OTP codes print to the server console)
   - `PLATFORM_OWNER_EMAIL` — the single account the seed script grants the `PLATFORM_OWNER` role to; that role is never obtainable any other way
3. `npm run db:push` (or `db:migrate` once you're managing real migrations) to create the schema on TiDB
4. `npm run db:seed` (or `npm run seed`) for demo addresses, incidents, fraud signals, org invite codes, seeded demo accounts, and the platform-owner account (refuses to run with `NODE_ENV=production`) — prints the demo emails, the fixed demo OTP code, and both invite codes to the console when it finishes
5. `npm run dev`

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
