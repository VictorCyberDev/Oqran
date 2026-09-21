"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  discardFailed,
  flushQueue,
  getQueueSnapshot,
  getServerQueueSnapshot,
  retryFailed,
  startAutoFlush,
  subscribeQueue,
} from "@/lib/offline/queue";

/**
 * App-wide connection state. Deliberately visible rather than silent —
 * someone filing an incident report during a power cut needs to know
 * whether it left the device.
 *
 * Both values are read straight from their source rather than mirrored
 * into component state, so the banner can never disagree with what is
 * actually queued or with the browser's own connection status.
 *
 * navigator.onLine only reports whether there's a network interface, not
 * whether anything is reachable through it, so a failed replay is treated
 * as its own signal instead of being trusted away.
 */
function subscribeToConnection(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function ConnectionBanner() {
  // Nothing is known about the client's connection during the server
  // render, and assuming online keeps the banner out of the markup.
  const online = useSyncExternalStore(subscribeToConnection, () => navigator.onLine, () => true);
  const { pending, failed, syncing, justSent } = useSyncExternalStore(
    subscribeQueue,
    getQueueSnapshot,
    getServerQueueSnapshot
  );

  // The drain loop belongs to the queue, not to this component — queued
  // writes should send regardless of which screen is open. This only
  // makes sure it has been started.
  useEffect(() => {
    startAutoFlush();
  }, []);

  const hasFailures = failed.length > 0;
  if (online && pending === 0 && !hasFailures && justSent === 0) return null;

  const tone = !online
    ? "bg-risk-guarded/[0.14] text-risk-guarded"
    : hasFailures
      ? "bg-risk-critical/[0.14] text-risk-critical"
      : "bg-brand/10 text-brand";

  return (
    <div className={`w-full px-5 py-2 text-xs font-semibold ${tone}`} role="status" aria-live="polite">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-2 gap-y-1">
        {!online && (
          <span>
            You&rsquo;re offline.{" "}
            {pending > 0
              ? `${pending} ${pending === 1 ? "change is" : "changes are"} saved on this device and will send automatically.`
              : "Saved views still work; anything you submit will be held until you reconnect."}
          </span>
        )}

        {online && pending > 0 && (
          <span>
            {syncing
              ? `Sending ${pending} saved ${pending === 1 ? "change" : "changes"}…`
              : `${pending} saved ${pending === 1 ? "change" : "changes"} waiting to send.`}
          </span>
        )}

        {online && pending === 0 && justSent > 0 && !hasFailures && (
          <span>
            {justSent} saved {justSent === 1 ? "change" : "changes"} sent.
          </span>
        )}

        {hasFailures && (
          <span>
            {failed.length} {failed.length === 1 ? "change" : "changes"} couldn&rsquo;t be sent:{" "}
            {failed[0].label}
            {failed[0].lastError ? ` — ${failed[0].lastError}` : ""}
          </span>
        )}

        {online && pending > 0 && !syncing && (
          <button onClick={() => void flushQueue()} className="underline underline-offset-2">
            Try now
          </button>
        )}

        {online && hasFailures && !syncing && (
          <>
            <button
              onClick={async () => {
                await retryFailed();
                await flushQueue();
              }}
              className="underline underline-offset-2"
            >
              Try again
            </button>
            <button onClick={() => void discardFailed()} className="underline underline-offset-2">
              Discard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
