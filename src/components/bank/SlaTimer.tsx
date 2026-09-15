"use client";

import { useEffect, useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

function computeLabel(
  deadline: number,
  resolved: boolean,
  now: number
): { text: string; tone: BadgeTone } {
  if (resolved) return { text: "Resolved", tone: "low" };
  const remainingMs = deadline - now;
  if (remainingMs <= 0) {
    const overMin = Math.round(-remainingMs / 60000);
    return { text: `SLA breached · ${overMin}m over`, tone: "critical" };
  }
  const remainingMin = Math.round(remainingMs / 60000);
  if (remainingMin <= 10) return { text: `SLA soon · ${remainingMin}m left`, tone: "guarded" };
  return { text: `${remainingMin}m left on SLA`, tone: "neutral" };
}

/** serverNow: the timestamp (ms) at server-render time, so the first paint
 * already shows a correct countdown instead of a blank flash before the
 * client clock kicks in. */
export function SlaTimer({
  slaDeadline,
  resolved,
  serverNow,
}: {
  slaDeadline: string;
  resolved: boolean;
  serverNow: number;
}) {
  const deadline = new Date(slaDeadline).getTime();
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const { text, tone } = computeLabel(deadline, resolved, now);
  return <Badge tone={tone}>{text}</Badge>;
}
