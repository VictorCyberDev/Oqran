import "server-only";

/**
 * Transactional email via the Resend HTTP API (no SMTP credentials to manage).
 * Requires RESEND_API_KEY and EMAIL_FROM in production. In development,
 * with no API key configured, the code is logged to the server console
 * instead of being sent — this path is hard-gated to non-production so an
 * OTP is never silently swallowed (or leaked to logs) in a live deployment.
 */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email provider is not configured (RESEND_API_KEY / EMAIL_FROM)");
    }
    console.info(`[dev email] OTP for ${to}: ${code}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Your OQRAN verification code",
      text: `Your OQRAN verification code is ${code}. It expires in 10 minutes. Never share this code — OQRAN staff will never ask for it.`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send verification email (status ${res.status})`);
  }
}
