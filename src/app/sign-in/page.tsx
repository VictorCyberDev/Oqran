"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell, AuthHeading, FormError } from "../(auth)/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Step =
  | { name: "credential" }
  | { name: "otp"; email: string }
  | { name: "unlock"; deviceId: string }
  | { name: "trust-device"; role: string };

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "credential" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function goHome(role: string) {
    const path =
      { CITIZEN: "/citizen", BUSINESS: "/business", BANK: "/bank", GOVERNMENT: "/gov", DEVELOPER: "/developer", ADMIN: "/admin", PLATFORM_OWNER: "/owner" }[
        role
      ] ?? "/";
    router.push(path);
  }

  async function submitCredential() {
    setBusy(true);
    setError(null);
    const res = await postJson("/api/auth/sign-in/continue", { email });
    if (!res.ok) {
      setBusy(false);
      return setError(res.error ?? "Something went wrong.");
    }
    if (res.mode === "unlock") {
      setBusy(false);
      setStep({ name: "unlock", deviceId: res.deviceId });
      return;
    }
    // TEMPORARY (hackathon deadline): OTP is disabled server-side (see
    // src/lib/auth/otp.ts), so skip the code-entry screen entirely and
    // verify immediately with a placeholder — restore `setStep({ name:
    // "otp", email })` here once OTP is re-enabled.
    const verifyRes = await postJson("/api/auth/sign-in/verify-otp", { email, code: "000000" });
    setBusy(false);
    if (!verifyRes.ok) return setError(verifyRes.error ?? "Something went wrong.");
    setStep({ name: "trust-device", role: verifyRes.role });
  }

  async function submitOtp() {
    if (step.name !== "otp") return;
    setBusy(true);
    setError(null);
    const res = await postJson("/api/auth/sign-in/verify-otp", { email: step.email, code });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Something went wrong.");
    setStep({ name: "trust-device", role: res.role });
  }

  async function submitUnlock() {
    if (step.name !== "unlock") return;
    setBusy(true);
    setError(null);
    const res = await postJson("/api/auth/sign-in/unlock", { deviceId: step.deviceId, pin });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Incorrect PIN.");
    goHome(res.role);
  }

  async function submitTrustDevice() {
    if (step.name !== "trust-device") return;
    setBusy(true);
    await postJson("/api/auth/trust-device", { pin, label: "This browser" });
    setBusy(false);
    goHome(step.role);
  }

  return (
    <AuthShell
      stepKey={step.name}
      onBack={step.name === "credential" ? undefined : () => setStep({ name: "credential" })}
    >
      {step.name === "credential" && (
        <>
          <AuthHeading title="OQRAN" subtitle="Sign in to continue" />
          <FormError message={error} />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-semibold text-text-primary">Email address</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                type="email"
              />
            </div>
            <Button fullWidth disabled={busy || !email} onClick={submitCredential}>
              Continue
            </Button>
            <p className="text-center text-xs font-medium text-text-primary/45">
              We&rsquo;ll never ask for your NIN to sign in
            </p>
          </div>
        </>
      )}

      {step.name === "otp" && (
        <>
          <AuthHeading title="Enter verification code" subtitle={`Code sent to ${step.email}`} />
          <FormError message={error} />
          <div className="flex flex-col gap-4">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              inputMode="numeric"
              className="text-center text-lg font-bold tracking-[0.4em]"
            />
            <Button fullWidth disabled={busy || code.length !== 6} onClick={submitOtp}>
              Verify &amp; Continue
            </Button>
          </div>
        </>
      )}

      {step.name === "unlock" && (
        <>
          <AuthHeading title="Welcome back" subtitle="This device is trusted — enter your PIN to continue" />
          <FormError message={error} />
          <div className="flex flex-col gap-4">
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="PIN"
              inputMode="numeric"
              type="password"
              className="text-center text-lg font-bold tracking-[0.4em]"
            />
            <Button fullWidth disabled={busy || pin.length < 4} onClick={submitUnlock}>
              Unlock
            </Button>
          </div>
        </>
      )}

      {step.name === "trust-device" && (
        <>
          <AuthHeading title="Secure this device" subtitle="Set a PIN to skip codes next time you sign in here" />
          <div className="flex flex-col gap-4">
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Choose a 4-6 digit PIN"
              inputMode="numeric"
              type="password"
              className="text-center text-lg font-bold tracking-[0.4em]"
            />
            <Button fullWidth disabled={busy || pin.length < 4} onClick={submitTrustDevice}>
              Trust this device
            </Button>
            <button
              type="button"
              className="text-center text-xs font-semibold text-brand"
              onClick={() => goHome(step.role)}
            >
              Not now
            </button>
          </div>
        </>
      )}

      {step.name === "credential" && (
        <p className="mt-6 text-center text-sm font-medium text-text-primary/55">
          New to OQRAN?{" "}
          <Link href="/create-account" className="font-semibold text-brand">
            Create an account
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
