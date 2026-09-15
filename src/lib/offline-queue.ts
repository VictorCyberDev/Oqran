const QUEUE_KEY = "oqran-incident-queue";

export interface QueuedIncident {
  category: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  queuedAt: number;
}

function readQueue(): QueuedIncident[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedIncident[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function queueIncident(payload: Omit<QueuedIncident, "queuedAt">) {
  writeQueue([...readQueue(), { ...payload, queuedAt: Date.now() }]);
}

export function queuedIncidentCount(): number {
  return readQueue().length;
}

/** Attempts to submit every queued incident; keeps whatever still fails. */
export async function flushIncidentQueue(): Promise<{ sent: number; remaining: number }> {
  const queue = readQueue();
  if (queue.length === 0) return { sent: 0, remaining: 0 };

  const stillQueued: QueuedIncident[] = [];
  let sent = 0;

  for (const item of queue) {
    try {
      const res = await fetch("/api/citizen/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) sent++;
      else stillQueued.push(item);
    } catch {
      stillQueued.push(item);
    }
  }

  writeQueue(stillQueued);
  return { sent, remaining: stillQueued.length };
}
