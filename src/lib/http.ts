import "server-only";
import { NextResponse } from "next/server";

export function jsonError(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export function clientIp(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? undefined;
}

export function userAgent(req: Request): string | undefined {
  return req.headers.get("user-agent") ?? undefined;
}
