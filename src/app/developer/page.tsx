import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { daysAgo, nowMs } from "@/lib/dates";
import { scoreLocationRisk } from "@/lib/geo/risk-score";
import { AppShell } from "@/components/layout/AppShell";
import { RoleHeader } from "@/components/layout/RoleHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { SimulatedChip } from "@/components/ui/SimulatedTag";
import { CreateKeyForm } from "@/components/developer/CreateKeyForm";
import { RevokeKeyButton } from "@/components/developer/RevokeKeyButton";
import { simulateNinIdentity } from "@/lib/simulation";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-bg-surface-sunken p-3 font-mono text-2xs leading-relaxed text-text-primary/80">
      {children}
    </pre>
  );
}

export default async function DeveloperConsole() {
  const session = await getSession();
  if (!session) return null;

  const [clients, usageThisMonth, sampleAddress] = await Promise.all([
    db.apiClient.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "desc" } }),
    db.apiUsage.count({
      where: { apiClient: { userId: session.userId }, requestedAt: { gte: daysAgo(30) } },
    }),
    db.address.findFirst({ orderBy: { updatedAt: "desc" } }),
  ]);

  // The documented example is generated from a real row and the real
  // scoring function, so what an integrator reads here is exactly what
  // the endpoint returns rather than hand-written placeholder JSON.
  let addressExample = "No addresses in this environment yet — create one to see a live example.";
  if (sampleAddress) {
    const nearby = await db.incident.findMany({
      where: {
        latitude: { gte: sampleAddress.latitude - 0.02, lte: sampleAddress.latitude + 0.02 },
        longitude: { gte: sampleAddress.longitude - 0.02, lte: sampleAddress.longitude + 0.02 },
        createdAt: { gte: daysAgo(180) },
      },
      select: { latitude: true, longitude: true, severity: true, createdAt: true },
    });
    const now = nowMs();
    const { score } = scoreLocationRisk(
      sampleAddress,
      nearby.map((i) => ({
        latitude: i.latitude!,
        longitude: i.longitude!,
        severity: i.severity,
        ageDays: (now - i.createdAt.getTime()) / (24 * 60 * 60 * 1000),
      }))
    );
    addressExample = JSON.stringify(
      {
        ok: true,
        address: {
          label: sampleAddress.label,
          confidenceTier: sampleAddress.confidenceTier,
          severity: sampleAddress.severity,
          riskScore: score,
          postcode: sampleAddress.postcode,
          zoneType: sampleAddress.zoneType,
          coordinates: {
            latitude: sampleAddress.latitude,
            longitude: sampleAddress.longitude,
          },
        },
      },
      null,
      2
    );
  }

  const demoNin = "12345678901";
  const identityExample = JSON.stringify(
    {
      ok: true,
      simulated: true,
      provenance: "Simulated — deterministic stand-in, pending NIMC API access",
      identity: (() => {
        const i = simulateNinIdentity(demoNin);
        return {
          status: i.status,
          holderRef: i.holderRef,
          watchlistRef: i.watchlistRef ?? null,
          otherInstitutionQueries7d: i.otherInstitutionQueries7d,
        };
      })(),
    },
    null,
    2
  );

  const lookupQuery = sampleAddress ? sampleAddress.label.split(",")[0] : "Bourdillon";

  return (
    <AppShell>
      <RoleHeader roleLabel="Developer" initial="D" />

      <div>
        <h1 className="text-3xl font-bold text-text-primary">API Console</h1>
        <p className="mt-0.5 text-xs font-medium text-text-primary/45">
          Address confidence tiers, risk scores and identity cross-reference over HTTP
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <StatTile label="Requests (30d)" value={usageThisMonth} />
        <StatTile
          label="Active keys"
          value={clients.filter((c) => c.status === "ACTIVE").length}
        />
      </div>

      <Card className="flex flex-col gap-3">
        <div>
          <p className="text-md font-bold text-text-primary">Address risk lookup</p>
          <p className="mt-0.5 text-xs font-medium text-text-primary/50">
            The confidence tier is what makes this different from a geocoder — it tells you how
            the address was established, not just where it is.
          </p>
        </div>
        <CodeBlock>{`curl -H "Authorization: Bearer oqr_live_..." \\
  "https://<your-app>/api/v1/addresses/lookup?label=${encodeURIComponent(lookupQuery)}"`}</CodeBlock>
        <CodeBlock>{addressExample}</CodeBlock>
        <p className="text-2xs font-medium text-text-primary/45">
          Scopes required: <span className="font-mono">read:addresses</span>. Live response from
          this environment&rsquo;s data.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-md font-bold text-text-primary">Identity cross-reference</p>
            <p className="mt-0.5 text-xs font-medium text-text-primary/50">
              Returns Matched, No match, or a regulatory watchlist hit for a NIN.
            </p>
          </div>
          <SimulatedChip className="mt-0.5 shrink-0" />
        </div>
        <CodeBlock>{`curl -H "Authorization: Bearer oqr_live_..." \\
  "https://<your-app>/api/v1/identity/cross-reference?nin=${demoNin}"`}</CodeBlock>
        <CodeBlock>{identityExample}</CodeBlock>
        <p className="text-2xs font-medium leading-relaxed text-text-primary/45">
          Scopes required: <span className="font-mono">read:identity</span>. Every response
          carries <span className="font-mono">simulated: true</span> and a provenance line —
          results are deterministic from the NIN, never random, and no real NIMC lookup is
          performed. Identities are returned as pseudonymous references, never names.
        </p>
      </Card>

      <div>
        <h2 className="mb-2 text-md font-bold text-text-primary">API Keys</h2>
        <div className="flex flex-col gap-2.5">
          {clients.length === 0 && (
            <p className="text-sm text-text-primary/55">
              No keys yet. Create one to start calling the endpoints above.
            </p>
          )}
          {clients.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface p-3.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-text-primary">{c.name}</p>
                <p className="font-mono text-xs text-text-primary/50">{c.apiKeyPrefix}…</p>
                <p className="mt-0.5 truncate font-mono text-2xs text-text-primary/40">
                  {c.scopes}
                </p>
              </div>
              {c.status === "REVOKED" ? (
                <Badge tone="neutral">Revoked</Badge>
              ) : (
                <RevokeKeyButton keyId={c.id} />
              )}
            </div>
          ))}
          <CreateKeyForm />
        </div>
      </div>
    </AppShell>
  );
}
