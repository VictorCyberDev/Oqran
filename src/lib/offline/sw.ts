"use client";

import { clearQueue } from "./queue";

/**
 * Service-worker lifecycle. Registration is deliberately production-only:
 * under `next dev` the chunks served from /_next/static aren't stable, so
 * a cache-first worker would hand back stale code and make hot reload
 * look broken. To exercise the offline shell locally, run a production
 * build (`npm run build && npm start`).
 */
export function registerServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") return;
  navigator.serviceWorker.register("/sw.js").catch(() => {
    // A blocked or unsupported worker just means no offline shell; the
    // IndexedDB write queue works without it.
  });
}

/**
 * Everything this device holds for the person signing out: queued writes
 * and cached assets. OQRAN runs on shared branch and field-office
 * devices, so leaving either behind would expose one person's pending
 * work to the next.
 */
export async function purgeOfflineData(): Promise<void> {
  try {
    await clearQueue();
  } catch {
    // An unavailable IndexedDB shouldn't block the sign-out itself.
  }

  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    registration?.active?.postMessage({ type: "OQRAN_PURGE" });
  } catch {
    // Same — sign-out must complete either way.
  }
}
