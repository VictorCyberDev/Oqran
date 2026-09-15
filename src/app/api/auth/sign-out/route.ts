import { NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { withErrorHandling } from "@/lib/api-handler";

export const POST = withErrorHandling(async () => {
  const session = await getSession();
  if (session) {
    await logActivity({ userId: session.userId, action: "SIGN_OUT" });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
});
