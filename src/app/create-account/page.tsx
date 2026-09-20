"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, AuthHeading, FormError } from "../(auth)/AuthShell";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconCircle } from "@/components/ui/IconCircle";

type SelfServiceRole = "CITIZEN" | "BUSINESS" | "DEVELOPER";
type OrgRole = "BANK" | "GOVERNMENT";
type BusinessOrgChoice = { mode: "new"; orgName: string } | { mode: "join"; inviteCode: string };

type Step =
  | { name: "role" }
  | { name: "business-org" }
  | { name: "credential"; role: SelfServiceRole; businessOrg?: BusinessOrgChoice }
  | { name: "otp"; role: SelfServiceRole; email: string; phone: string; businessOrg?: BusinessOrgChoice }
  | { name: "org"; role: OrgRole }
  | { name: "pending"; referenceCode: string; role: OrgRole }
  | { name: "created"; role: SelfServiceRole };

const ROLE_CARDS: {
  key: SelfServiceRole | OrgRole;
  title: string;
  desc: string;
  restricted: boolean;
}[] = [
  { key: "CITIZEN", title: "Citizen", desc: "Verify your address, view your safety status, report incidents.", restricted: false },
  { key: "BUSINESS", title: "Business (Landlord / Logistics / Insurer)", desc: "Check address and delivery-zone risk. No citizen PII.", restricted: false },
  { key: "DEVELOPER", title: "Developer", desc: "Integrate OQRAN via API. Console available on desktop.", restricted: false },
  { key: "BANK", title: "Bank Compliance Officer", desc: "Review flagged addresses and fraud signals for your institution.", restricted: true },
  { key: "GOVERNMENT", title: "Government Investigator", desc: "Query verified identity/address links and incident history.", restricted: true },
];

const ROLE_LABEL: Record<string, string> = {
  CITIZEN: "Citizen",
  BUSINESS: "Business",
  DEVELOPER: "Developer",
  BANK: "Bank Compliance",
  GOVERNMENT: "Government Investigator",
};

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function CreateAccountPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "role" });
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [orgMethod, setOrgMethod] = useState<"invite" | "email">("invite");
  const [inviteCode, setInviteCode] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [isLeadRequest, setIsLeadRequest] = useState(false);
  const [bizOrgMode, setBizOrgMode] = useState<"new" | "join">("new");
  const [bizOrgName, setBizOrgName] = useState("");
  const [bizInviteCode, setBizInviteCode] = useState("");
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
    if (step.name !== "credential") return;
    setBusy(true);
    setError(null);
    const res = await postJson("/api/auth/create-account/continue", { email, role: step.role });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Something went wrong.");
    setStep({ name: "otp", role: step.role, email, phone, businessOrg: step.businessOrg });
  }

  async function submitOtp() {
    if (step.name !== "otp") return;
    setBusy(true);
    setError(null);
    const res = await postJson("/api/auth/create-account/verify-otp", {
      email: step.email,
      code,
      role: step.role,
      phone: step.phone || undefined,
      businessOrg: step.businessOrg,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Something went wrong.");
    if (step.role === "DEVELOPER") setStep({ name: "created", role: step.role });
    else goHome(res.role);
  }

  function submitBusinessOrg() {
    const businessOrg: BusinessOrgChoice =
      bizOrgMode === "new" ? { mode: "new", orgName: bizOrgName } : { mode: "join", inviteCode: bizInviteCode };
    setStep({ name: "credential", role: "BUSINESS", businessOrg });
  }

  async function submitOrgVerify() {
    if (step.name !== "org") return;
    setBusy(true);
    setError(null);
    const res = await postJson("/api/auth/create-account/org", {
      role: step.role,
      method: orgMethod,
      email: orgEmail,
      inviteCode: orgMethod === "invite" ? inviteCode : undefined,
      idNumber,
      isLeadRequest,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Something went wrong.");
    setStep({ name: "pending", referenceCode: res.referenceCode, role: step.role });
  }

  return (
    <AuthShell
      stepKey={step.name}
      onBack={
        step.name === "role" || step.name === "pending" || step.name === "created"
          ? undefined
          : () => {
              if (step.name === "otp") {
                setStep({ name: "credential", role: step.role, businessOrg: step.businessOrg });
              } else if (step.name === "credential" && step.role === "BUSINESS") {
                setStep({ name: "business-org" });
              } else {
                setStep({ name: "role" });
              }
            }
      }
    >
      {step.name === "role" && (
        <>
          <AuthHeading title="Create your account" subtitle="Choose how you'll use OQRAN" />
          <div className="flex flex-col gap-3">
            {ROLE_CARDS.map((card) => (
              <button
                key={card.key}
                onClick={() => {
                  if (card.restricted) setStep({ name: "org", role: card.key as OrgRole });
                  else if (card.key === "BUSINESS") setStep({ name: "business-org" });
                  else setStep({ name: "credential", role: card.key as SelfServiceRole });
                }}
                className="flex flex-col gap-1 rounded-2xl border border-border-subtle bg-bg-surface p-4.5 text-left transition-colors hover:border-border-default"
              >
                <div className="flex items-center gap-2">
                  <span className="text-md font-bold text-text-primary">{card.title}</span>
                  {card.restricted && <Badge tone="brand">Requires approval</Badge>}
                </div>
                <span className="text-xs font-medium leading-relaxed text-text-primary/55">
                  {card.desc}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {step.name === "business-org" && (
        <>
          <AuthHeading title="Set up your business" subtitle="No admin review needed — you're in control of your own team" />
          <FormError message={error} />
          <div className="flex flex-col gap-4">
            <SegmentedControl
              options={[
                { value: "new", label: "Start a new business" },
                { value: "join", label: "Join with invite code" },
              ]}
              value={bizOrgMode}
              onChange={setBizOrgMode}
            />
            {bizOrgMode === "new" ? (
              <Input
                value={bizOrgName}
                onChange={(e) => setBizOrgName(e.target.value)}
                placeholder="Business name"
              />
            ) : (
              <Input
                value={bizInviteCode}
                onChange={(e) => setBizInviteCode(e.target.value)}
                placeholder="Invite code from your team lead"
              />
            )}
            <Button
              fullWidth
              disabled={bizOrgMode === "new" ? bizOrgName.length < 2 : !bizInviteCode}
              onClick={submitBusinessOrg}
            >
              Continue
            </Button>
            <p className="text-center text-xs font-medium text-text-primary/45">
              {bizOrgMode === "new"
                ? "You'll be the primary contact — you can invite teammates afterward."
                : "Ask your team lead for the invite code from their account."}
            </p>
          </div>
        </>
      )}

      {step.name === "credential" && (
        <>
          <AuthHeading title={`Create your ${ROLE_LABEL[step.role]} account`} />
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
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-semibold text-text-primary">
                Phone number <span className="font-normal text-text-primary/45">(optional)</span>
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0803 000 0000"
                type="tel"
              />
            </div>
            <Button fullWidth disabled={busy || !email} onClick={submitCredential}>
              Send code
            </Button>
            <p className="text-center text-xs font-medium text-text-primary/45">
              Your account is active as soon as you verify — NIN/registration comes later,
              optionally
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
              Verify &amp; Create Account
            </Button>
          </div>
        </>
      )}

      {step.name === "org" && (
        <>
          <AuthHeading
            title="Verify your organization"
            subtitle={`${ROLE_LABEL[step.role]} accounts require organizational review`}
          />
          <FormError message={error} />
          <div className="flex flex-col gap-4">
            <SegmentedControl
              options={[
                { value: "invite", label: "Invite Code" },
                { value: "email", label: "Work Email" },
              ]}
              value={orgMethod}
              onChange={setOrgMethod}
            />
            {orgMethod === "invite" && (
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Organizational invite code"
              />
            )}
            <Input
              value={orgEmail}
              onChange={(e) => setOrgEmail(e.target.value)}
              placeholder="Work email address"
              type="email"
            />
            <Input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder={step.role === "GOVERNMENT" ? "NIN" : "BVN"}
              inputMode="numeric"
            />
            <label className="flex items-start gap-2.5 text-xs font-medium text-text-primary/70">
              <input
                type="checkbox"
                checked={isLeadRequest}
                onChange={(e) => setIsLeadRequest(e.target.checked)}
                className="mt-0.5"
              />
              I&rsquo;m the primary contact for this organization — once approved, I can invite
              and manage my organization&rsquo;s other staff
            </label>
            <Button
              fullWidth
              disabled={busy || !orgEmail || idNumber.length < 10}
              onClick={submitOrgVerify}
            >
              Submit for Review
            </Button>
          </div>
        </>
      )}

      {step.name === "pending" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <IconCircle tone="guarded">
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
              <circle cx={12} cy={12} r={9} stroke="currentColor" strokeWidth={2} />
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </IconCircle>
          <h1 className="text-3xl font-bold text-text-primary">Verification Pending</h1>
          <p className="text-sm font-bold text-brand">Reference {step.referenceCode}</p>
          <p className="text-sm leading-relaxed text-text-primary/60">
            Your {ROLE_LABEL[step.role]} account is under review. An admin will approve access
            once your organizational details are confirmed.
          </p>
          <Button className="mt-2 px-9" onClick={() => router.push("/")}>
            Done
          </Button>
        </div>
      )}

      {step.name === "created" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <IconCircle tone="low">
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconCircle>
          <h1 className="text-3xl font-bold text-text-primary">Account Created</h1>
          <p className="text-sm leading-relaxed text-text-primary/60">
            Your Developer account is active. Visit the API console to generate your first key.
          </p>
          <Button className="mt-2 px-9" onClick={() => router.push("/developer")}>
            Go to console
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
