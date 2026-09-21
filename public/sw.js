/* global self, caches */

/**
 * OQRAN offline shell.
 *
 * Two rules drive everything below, and both exist because getting them
 * wrong is worse than having no service worker at all:
 *
 *  1. Never cache an authenticated HTML page. OQRAN is used on shared
 *     devices in branches and field offices. A cached dashboard would be
 *     served to whoever opens the browser next, signed in or not. So
 *     navigations are network-first and their responses are never stored —
 *     the fallback is a static page that contains nobody's data.
 *
 *  2. Never cache an RSC payload. Next.js fetches `?_rsc=` flight data for
 *     client navigations, keyed to the build. Serving a stale one produces
 *     a blank or mismatched screen with no error, which is far harder to
 *     diagnose than a failed request. Those requests are passed straight
 *     through.
 *
 * What is cached is only what is safe to cache: content-hashed build
 * assets, which are immutable, and the offline page.
 *
 * Writes are not this file's job. They are queued in IndexedDB by
 * src/lib/offline/queue.ts with an idempotency key, which survives a
 * refresh and replays on reconnect. See docs/OFFLINE.md.
 */

const VERSION = "v1";
const ASSET_CACHE = `oqran-assets-${VERSION}`;
const SHELL_CACHE = `oqran-shell-${VERSION}`;
const CURRENT_CACHES = [ASSET_CACHE, SHELL_CACHE];
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // `reload` so a redeploy picks up a changed offline page instead of
      // revalidating against the browser's own HTTP cache.
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("oqran-") && !CURRENT_CACHES.includes(n))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

/** Sign-out purges everything this worker holds, so the next person on a
 * shared device starts from nothing. */
self.addEventListener("message", (event) => {
  if (event.data?.type !== "OQRAN_PURGE") return;
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("oqran-")).map((n) => caches.delete(n)));
      // Put the offline page back — it holds no user data and is the one
      // thing needed for the next offline visit to be handled gracefully.
      const cache = await caches.open(SHELL_CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" })).catch(() => {});
    })()
  );
});

function isImmutableAsset(url) {
  // Content-hashed by the build, so the URL changes whenever the bytes do.
  return url.pathname.startsWith("/_next/static/");
}

function isRscRequest(request, url) {
  return url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Anything that isn't a plain same-origin GET is left entirely alone:
  // API writes, cross-origin map tiles and geocoder calls, everything.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (isRscRequest(request, url)) return;

  if (isImmutableAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(ASSET_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Not stored: see rule 1 above.
          return await fetch(request);
        } catch {
          const offline = await caches.match(OFFLINE_URL);
          return (
            offline ??
            new Response("You are offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })()
    );
  }
});
