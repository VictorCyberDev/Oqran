"use client";

/**
 * Durable queue for writes made while offline. Survives a refresh, drains
 * on reconnect.
 *
 * Every entry carries a client-generated id that is sent to the server as
 * `clientRequestId`. The server treats a repeat of the same id as the same
 * write, which is what makes replay safe: a queued request may already have
 * succeeded with only the response lost, and without that key a reconnect
 * would turn one escalation into two.
 *
 * Only writes whose result the user doesn't need immediately are queued.
 * Anything that exists to return a live answer (NIN lookup, street check,
 * risk scoring) and anything security-sensitive (sign-in, staff removal,
 * device revocation, key issuance) deliberately fails loudly instead —
 * see docs/OFFLINE.md.
 */

const DB_NAME = "oqran-offline";
const DB_VERSION = 1;
const STORE = "writes";
const LEGACY_KEY = "oqran-incident-queue";

export type QueueState = "pending" | "failed";

export interface QueuedWrite {
  id: string;
  url: string;
  method: "POST" | "PATCH";
  body: Record<string, unknown>;
  /** Human description for the UI — "Incident report · Theft or Robbery". */
  label: string;
  queuedAt: number;
  attempts: number;
  state: QueueState;
  lastError?: string;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function listQueue(): Promise<QueuedWrite[]> {
  try {
    const all = await withStore<QueuedWrite[]>("readonly", (s) => s.getAll() as IDBRequest<QueuedWrite[]>);
    return all.sort((a, b) => a.queuedAt - b.queuedAt);
  } catch {
    return [];
  }
}

export async function queueCount(): Promise<number> {
  return (await listQueue()).filter((e) => e.state === "pending").length;
}

/* --------------------------------------------------------------------
 * Observable snapshot
 *
 * The queue lives outside React, so it publishes a synchronous snapshot
 * that useSyncExternalStore can read. Keeping the state here rather than
 * mirrored into a component means the indicator can never disagree with
 * what is actually stored, and the drain loop doesn't depend on any
 * particular component being mounted.
 * ------------------------------------------------------------------ */

export interface QueueSnapshot {
  pending: number;
  failed: QueuedWrite[];
  syncing: boolean;
  /** Count from the most recent successful drain, cleared shortly after
   * so the confirmation doesn't linger. */
  justSent: number;
}

const NO_FAILURES: QueuedWrite[] = [];
const EMPTY_SNAPSHOT: QueueSnapshot = { pending: 0, failed: NO_FAILURES, syncing: false, justSent: 0 };

let snapshot: QueueSnapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();

export function subscribeQueue(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getQueueSnapshot(): QueueSnapshot {
  return snapshot;
}

/** Nothing is queued on the server; a stable object keeps the hydration
 * render identical to the server render. */
export function getServerQueueSnapshot(): QueueSnapshot {
  return EMPTY_SNAPSHOT;
}

function patchSnapshot(next: Partial<QueueSnapshot>) {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener();
}

async function refreshSnapshot(): Promise<void> {
  const all = await listQueue();
  patchSnapshot({
    pending: all.filter((e) => e.state === "pending").length,
    failed: all.filter((e) => e.state === "failed"),
  });
}

function notifyQueueChanged() {
  void refreshSnapshot();
}

async function put(entry: QueuedWrite): Promise<void> {
  await withStore("readwrite", (s) => s.put(entry) as IDBRequest<IDBValidKey>);
  notifyQueueChanged();
}

export async function removeEntry(id: string): Promise<void> {
  await withStore("readwrite", (s) => s.delete(id) as unknown as IDBRequest<undefined>);
  notifyQueueChanged();
}

/** Drops everything — called on sign-out so one person's pending writes
 * can't replay under the next person's session on a shared device. */
export async function clearQueue(): Promise<void> {
  await withStore("readwrite", (s) => s.clear() as unknown as IDBRequest<undefined>);
  notifyQueueChanged();
}

/**
 * One-time move of anything sitting in the original localStorage
 * incident queue, so reports saved before this existed aren't dropped.
 */
async function drainLegacyQueue(): Promise<void> {
  if (typeof localStorage === "undefined") return;
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  try {
    const items = JSON.parse(raw) as Record<string, unknown>[];
    for (const item of items) {
      const id = newId();
      await put({
        id,
        url: "/api/citizen/incidents",
        method: "POST",
        body: { ...item, clientRequestId: id },
        label: "Incident report (saved earlier)",
        queuedAt: typeof item.queuedAt === "number" ? item.queuedAt : Date.now(),
        attempts: 0,
        state: "pending",
      });
    }
  } catch {
    // Unparseable legacy data isn't worth blocking startup over.
  }
  localStorage.removeItem(LEGACY_KEY);
}

/** Moves dead-lettered writes back into the queue — the action offered
 * after someone signs in again following an expired-session failure. */
export async function retryFailed(): Promise<void> {
  const failed = (await listQueue()).filter((e) => e.state === "failed");
  for (const entry of failed) {
    await put({ ...entry, state: "pending", lastError: undefined });
  }
}

/** Throws away dead-lettered writes. Without this a permanently rejected
 * entry would sit in the banner forever with nothing the user can do. */
export async function discardFailed(): Promise<void> {
  const failed = (await listQueue()).filter((e) => e.state === "failed");
  for (const entry of failed) {
    await removeEntry(entry.id);
  }
}

export interface SubmitOptions {
  url: string;
  method?: "POST" | "PATCH";
  body: Record<string, unknown>;
  label: string;
}

export type SubmitResult =
  | { status: "sent"; data: Record<string, unknown> }
  | { status: "queued" }
  | { status: "error"; error: string };

/**
 * Send now, or keep it for later. Used by every queue-eligible action so
 * they behave identically.
 *
 * A validation or authorisation rejection is returned as an error rather
 * than queued — replaying it would fail the same way every time.
 */
export async function submitOrQueue(opts: SubmitOptions): Promise<SubmitResult> {
  const id = newId();
  const body = { ...opts.body, clientRequestId: id };
  const entry: QueuedWrite = {
    id,
    url: opts.url,
    method: opts.method ?? "POST",
    body,
    label: opts.label,
    queuedAt: Date.now(),
    attempts: 0,
    state: "pending",
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await put(entry);
    return { status: "queued" };
  }

  try {
    const res = await fetch(entry.url, {
      method: entry.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status >= 500) {
      await put(entry);
      return { status: "queued" };
    }

    const json = (await res.json()) as Record<string, unknown>;
    if (res.ok && json.ok) return { status: "sent", data: json };
    return { status: "error", error: String(json.error ?? "That didn't go through.") };
  } catch {
    // Network-level failure — the request never reached the server.
    await put(entry);
    return { status: "queued" };
  }
}

/**
 * What to do with a queued write after the server answered. Kept pure and
 * separate because this is where a bug silently loses someone's report:
 * treating a permanent rejection as retryable replays it forever, and
 * treating a transient one as permanent throws the write away.
 */
export type ReplayDecision =
  | { kind: "done" }
  | { kind: "retry"; reason: string }
  | { kind: "dead"; reason: string };

export function decideReplay(status: number): ReplayDecision {
  if (status >= 200 && status < 300) return { kind: "done" };

  // 408 and 429 are the server asking for the request again later, not
  // telling us it was wrong.
  if (status === 408) return { kind: "retry", reason: "The request timed out" };
  if (status === 429) return { kind: "retry", reason: "Rate limited \u2014 will try again" };

  if (status === 401 || status === 403) {
    return { kind: "dead", reason: "Your session expired \u2014 sign in again to send this." };
  }
  if (status >= 400 && status < 500) {
    return { kind: "dead", reason: "The server rejected this." };
  }

  return { kind: "retry", reason: `Server error ${status}` };
}

export interface FlushResult {
  sent: number;
  failed: number;
  remaining: number;
}

/** Replays every pending entry. Safe to call repeatedly — the server
 * deduplicates on clientRequestId. */
export async function flushQueue(): Promise<FlushResult> {
  patchSnapshot({ syncing: true });
  try {
    return await runFlush();
  } finally {
    patchSnapshot({ syncing: false });
  }
}

let justSentTimer: ReturnType<typeof setTimeout> | undefined;

async function runFlush(): Promise<FlushResult> {
  await drainLegacyQueue();

  const entries = (await listQueue()).filter((e) => e.state === "pending");
  let sent = 0;
  let failed = 0;

  for (const entry of entries) {
    if (typeof navigator !== "undefined" && !navigator.onLine) break;

    try {
      const res = await fetch(entry.url, {
        method: entry.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.body),
      });

      const decision = decideReplay(res.status);
      const attempts = entry.attempts + 1;

      if (decision.kind === "done") {
        await removeEntry(entry.id);
        sent++;
        continue;
      }

      if (decision.kind === "dead") {
        // Retrying would never help, so it's parked where the user can
        // see it rather than silently dropped.
        await put({ ...entry, state: "failed", attempts, lastError: decision.reason });
        failed++;
        continue;
      }

      await put({ ...entry, attempts, lastError: decision.reason });
    } catch {
      await put({ ...entry, attempts: entry.attempts + 1, lastError: "Still offline" });
      break;
    }
  }

  await refreshSnapshot();

  if (sent > 0) {
    patchSnapshot({ justSent: sent });
    clearTimeout(justSentTimer);
    justSentTimer = setTimeout(() => patchSnapshot({ justSent: 0 }), 6000);
  }

  return { sent, failed, remaining: snapshot.pending };
}

/**
 * Starts the drain loop: once now, and again whenever the connection
 * comes back. Deliberately owned by this module rather than by a
 * component, so queued writes are sent regardless of which screen
 * happens to be open. Safe to call more than once.
 */
let autoFlushRunning = false;

export function startAutoFlush(): void {
  if (typeof window === "undefined" || autoFlushRunning) return;
  autoFlushRunning = true;

  const drain = () => {
    if (navigator.onLine) void flushQueue();
    else void refreshSnapshot();
  };

  window.addEventListener("online", drain);
  drain();
}
