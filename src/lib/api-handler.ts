import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RateLimitError } from "@/lib/rate-limit";

export function withErrorHandling<Args extends unknown[]>(
  handler: (req: Request, ...args: Args) => Promise<NextResponse>
) {
  return async (req: Request, ...args: Args) => {
    try {
      return await handler(req, ...args);
    } catch (err) {
      if (err instanceof RateLimitError) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 429 });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { ok: false, error: err.issues[0]?.message ?? "Invalid request" },
          { status: 400 }
        );
      }
      console.error(err);
      return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
    }
  };
}
