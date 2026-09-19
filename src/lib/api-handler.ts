import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RateLimitError } from "@/lib/rate-limit";
import { EmailDeliveryError } from "@/lib/auth/otp";
import { SessionConfigError } from "@/lib/auth/session";

export function withErrorHandling<Args extends unknown[]>(
  handler: (req: Request, ...args: Args) => Promise<NextResponse>,
  extraHeaders?: HeadersInit
) {
  return async (req: Request, ...args: Args) => {
    try {
      return await handler(req, ...args);
    } catch (err) {
      if (err instanceof RateLimitError) {
        return NextResponse.json(
          { ok: false, error: err.message },
          { status: 429, headers: extraHeaders }
        );
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { ok: false, error: err.issues[0]?.message ?? "Invalid request" },
          { status: 400, headers: extraHeaders }
        );
      }
      if (err instanceof EmailDeliveryError) {
        // The real cause (missing config vs. provider rejection) is already
        // logged by otp.ts — this stays generic to the client on purpose.
        return NextResponse.json(
          { ok: false, error: err.message },
          { status: 502, headers: extraHeaders }
        );
      }
      if (err instanceof SessionConfigError) {
        // The real cause (AUTH_JWT_SECRET missing/too short) is already
        // logged by session.ts — this stays generic to the client on purpose.
        return NextResponse.json(
          { ok: false, error: err.message },
          { status: 503, headers: extraHeaders }
        );
      }
      console.error(err);
      return NextResponse.json(
        { ok: false, error: "Something went wrong" },
        { status: 500, headers: extraHeaders }
      );
    }
  };
}
