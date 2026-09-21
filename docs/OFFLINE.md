# Offline resilience

Nigerian connectivity is intermittent by default, not by exception. A bank
officer in a branch with a dying link, an investigator standing inside the
location they are assessing, a citizen reporting an incident during a power
cut — all three lose the network at the exact moment the platform matters
most. OQRAN is built so that losing the network costs you latency, never
work and never truth.

This document states what works offline, what deliberately does not, and
why — so a reviewer can check the claims rather than take them on trust.

## The rule that decides everything

**A write whose result you don't need this second is queued. Everything
else fails loudly.**

Queuing a write that needs a live answer would be a lie: an address
verification that returns a cached "verified" is worse than no answer,
because someone will act on it. So the split is drawn by whether a stale
or deferred answer could mislead, not by what is technically possible.

## What is queued

These actions are accepted while offline, stored on the device, and sent
automatically on reconnect:

| Action | Endpoint |
| --- | --- |
| Citizen incident report | `POST /api/citizen/incidents` |
| Bank escalation to Government | `POST /api/bank/escalate` |
| Open an incident as a case | `POST /api/gov/cases` |
| Case note / status change | `PATCH /api/gov/cases/[id]` |
| Flag a location as dangerous | `POST /api/gov/flag-danger` |

Each one tells the user plainly that it is saved on the device and will
send later. None of them pretends to have succeeded.

## What is deliberately *not* queued

**Anything that exists to return a live answer.** Address verification,
the street risk check, NIN cross-reference, risk scoring, the developer
console's API probes. These are questions, not writes. A deferred answer
is not an answer, and a cached one can be wrong in the direction that
causes harm. They fail with a clear message instead.

**Anything security-sensitive.** Sign-in, OTP verification, PIN and
device-trust changes, staff invitation and removal, device revocation, API
key issuance. Replaying a security decision made offline against a state
that has since changed is how you re-grant access that was just revoked.

**Platform Owner and Admin surfaces** (`/owner`, `/admin/*`). These are
oversight views: rate-limit hotspots, anomaly signals, SLA breaches,
ledger integrity. A stale oversight number read as current is a false
all-clear on exactly the thing being monitored. They require a live
connection, by design.

## Why a duplicate can't happen

The hard part of a write queue is not storing the request — it's that a
queued request may have already reached the server with only the *response*
lost. Replaying it blindly turns one escalation into two.

Every queued write carries a client-generated `clientRequestId` (`src/lib/offline/idempotency.ts`).
The server treats a repeat of an id it has already seen as the same write
and returns the original result with `duplicate: true` rather than
creating a second record. The column is `@unique` on `Incident`, `Case` and
`CaseNote` (migration `20260921024407_add_client_request_id`), so the
guarantee is enforced by the database, not by application timing.

MySQL/TiDB unique indexes permit multiple NULLs, which is what makes this
additive: every row written before this existed, and every write made
online without a key, keeps `clientRequestId = NULL` and is unaffected.
Both properties were verified against a populated database before the
migration was committed.

## Replay policy

`decideReplay()` in `src/lib/offline/queue.ts` classifies each server
response, and is unit-tested (`queue.test.ts`) because a mistake here
either replays forever or throws someone's report away:

- **2xx** — done, entry removed.
- **5xx, network failure, 408, 429** — transient, stays queued and retries.
- **401 / 403** — dead-lettered with "your session expired", because
  retrying will never help until the person signs in again.
- **Other 4xx** — dead-lettered as rejected.

Dead-lettered entries are surfaced in the connection banner by name, with
**Try again** and **Discard** — never dropped silently.

## Storage and the shell

- **Write queue** — IndexedDB (`oqran-offline` / `writes`), so it survives
  a refresh, a crash and a battery death. The earlier localStorage-only
  incident queue is drained into it once on first run so nothing saved
  before this shipped is lost.
- **Service worker** (`public/sw.js`) — caches content-hashed
  `/_next/static/*` assets and a static offline page. Registered in
  production only; under `next dev` a cache-first worker would serve stale
  chunks. To test locally: `npm run build && npm start`, then toggle
  offline in DevTools.

Two things the service worker will not do, both because getting them wrong
is worse than having no worker:

1. **It never caches authenticated HTML.** OQRAN runs on shared branch and
   field-office devices. A cached dashboard would be served to whoever
   opens the browser next. Navigations are network-first and their
   responses are never stored; the fallback is `public/offline.html`, a
   static page containing nobody's data.
2. **It never caches RSC payloads** (`?_rsc=`). Next.js keys flight data to
   the build; a stale payload produces a blank or mismatched screen with no
   error, which is far harder to diagnose than a failed request.

Signing out purges both: the IndexedDB queue is cleared and the worker is
told to drop every `oqran-*` cache, so one person's pending work can't
replay under the next person's session.

## Honest limits

- The banner uses `navigator.onLine`, which reports whether a network
  interface exists, not whether anything is reachable through it. A failed
  replay is therefore treated as its own signal rather than trusted away.
- Dashboards are not cached, so a cold navigation while offline shows the
  offline page rather than stale data. Showing last-known figures without
  a visible "as of" timestamp was judged more dangerous than showing
  nothing.
- Nothing here has been tested on a real degraded Nigerian network — only
  against a simulated one. A network that is *slow* rather than absent
  behaves differently from either state and is not specifically handled.

## How this was verified

Against a production build in headless Chromium, with the connection
toggled at the browser level rather than mocked:

- the worker registers, takes control, and creates only the two versioned
  caches;
- the only things cached are content-hashed `/_next/static/*` assets and
  the offline page — no HTML page, no `?_rsc=` payload;
- a navigation, while offline, to a page never visited serves the offline
  page rather than a browser error;
- `fetch` to an API route while offline fails rather than being answered
  from cache;
- the sign-out purge empties every `oqran-*` cache.

And for the write queue, against the browser's real IndexedDB:

- a submit made offline reports "queued" and is persisted with an
  idempotency key;
- it survives a reload taken while still offline;
- reconnecting drains it automatically — the app's own loop, not a manual
  call — and the server receives **exactly one** request, carrying the
  original key;
- a further drain sends nothing;
- a 403 is dead-lettered with "sign in again" rather than retried forever;
- sign-out clears the queue.

`decideReplay` is additionally covered by unit tests
(`src/lib/offline/queue.test.ts`), and the migration's two load-bearing
database properties — multiple NULLs allowed, a repeated key rejected —
were checked against a populated local database before it was committed.
