import "server-only";

/**
 * SMS delivery is provider-agnostic by design: no Nigerian SMS aggregator
 * (Termii, Africa's Talking, etc.) has been chosen yet. Wire SMS_PROVIDER_URL
 * / SMS_PROVIDER_API_KEY to a real provider before going live — until then,
 * this throws in production rather than pretending to deliver, and logs to
 * the console in development so the sign-in flow stays testable locally.
 */
export async function sendOtpSms(to: string, code: string): Promise<void> {
  const providerUrl = process.env.SMS_PROVIDER_URL;
  const apiKey = process.env.SMS_PROVIDER_API_KEY;

  if (!providerUrl || !apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMS provider is not configured (SMS_PROVIDER_URL / SMS_PROVIDER_API_KEY)");
    }
    console.info(`[dev sms] OTP for ${to}: ${code}`);
    return;
  }

  const res = await fetch(providerUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      message: `Your OQRAN verification code is ${code}. It expires in 10 minutes.`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send verification SMS (status ${res.status})`);
  }
}
