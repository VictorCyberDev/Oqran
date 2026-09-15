import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RateLimitError } from "@/lib/rate-limit";

export function withErrorHandling(
  handler: (req: Request) => Promise<NextResponse>
) {
  return async (req: Request) => {
    try {
      return await handler(req);
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
