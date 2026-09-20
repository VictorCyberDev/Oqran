"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell, AuthHeading, FormError } from "../(auth)/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconCircle } from "@/components/ui/IconCircle";

function LockIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x={4} y={10} width={16} height={10} rx={2.5} stroke="currentColor" strokeWidth={2} />
      <path d="M8 10V7.5a4 4 0 118 0V10" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6l7-3z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
  const [pinConfirm, setPinConfirm] = useState("");
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
    setBusy(false);
    if (res.mode === "unlock") return setStep({ name: "unlock", deviceId: res.deviceId });
    setStep({ name: "otp", email });
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
    setError(null);
    // Previously the response was discarded, so a failed request still
    // navigated on as though the device had been trusted.
    const res = await postJson("/api/auth/trust-device", { pin, label: "This browser" });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Couldn't secure this device. Try again.");
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
          <div className="mb-5 flex justify-center">
            <IconCircle tone="low">
              <LockIcon />
            </IconCircle>
          </div>
          <AuthHeading
            title="Welcome back"
            subtitle="This device is trusted — enter your PIN to continue"
          />
          <FormError message={error} />
          <div className="flex flex-col gap-4">
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="PIN"
              inputMode="numeric"
              type="password"
              autoComplete="current-password"
              className="text-center text-lg font-bold tracking-[0.4em]"
            />
            <Button fullWidth disabled={busy || pin.length < 4} onClick={submitUnlock}>
              {busy ? "Unlocking…" : "Unlock"}
            </Button>
          </div>
        </>
      )}

      {step.name === "trust-device" && (
        <>
          <div className="mb-5 flex justify-center">
            <IconCircle tone="low">
              <ShieldIcon />
            </IconCircle>
          </div>
          <AuthHeading
            title="Secure this device"
            subtitle="Set a PIN to skip codes next time you sign in here"
          />
          <FormError message={error} />
          <div className="flex flex-col gap-4">
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Choose a 4-6 digit PIN"
              inputMode="numeric"
              type="password"
              autoComplete="new-password"
              className="text-center text-lg font-bold tracking-[0.4em]"
            />
            {/* Confirmed before it's stored — a mistyped PIN would
                otherwise lock this device out of the fast path with no
                way to discover the typo. */}
            <Input
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Confirm your PIN"
              inputMode="numeric"
              type="password"
              autoComplete="new-password"
              className="text-center text-lg font-bold tracking-[0.4em]"
            />
            {pinConfirm.length > 0 && pinConfirm !== pin && (
              <p className="-mt-1 text-center text-xs font-semibold text-danger">
                Those PINs don&rsquo;t match.
              </p>
            )}
            <Button
              fullWidth
              disabled={busy || pin.length < 4 || pin !== pinConfirm}
              onClick={submitTrustDevice}
            >
              {busy ? "Saving…" : "Trust this device"}
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
