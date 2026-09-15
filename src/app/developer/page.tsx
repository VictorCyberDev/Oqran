import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { daysAgo } from "@/lib/dates";
import { AppShell } from "@/components/layout/AppShell";
import { RoleHeader } from "@/components/layout/RoleHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreateKeyForm } from "@/components/developer/CreateKeyForm";
import { RevokeKeyButton } from "@/components/developer/RevokeKeyButton";

export default async function DeveloperConsole() {
  const session = await getSession();
  if (!session) return null;

  const clients = await db.apiClient.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  const usageThisMonth = await db.apiUsage.count({
    where: { apiClient: { userId: session.userId }, requestedAt: { gte: daysAgo(30) } },
  });

  return (
    <AppShell>
      <RoleHeader roleLabel="Developer" initial="D" />
      <h1 className="text-3xl font-bold text-text-primary">API Console</h1>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-primary/50">
            Usage (last 30 days)
          </p>
          <p className="text-2xl font-bold text-text-primary">{usageThisMonth} requests</p>
        </div>
      </Card>

      <div>
        <h2 className="mb-2 text-md font-bold text-text-primary">API Keys</h2>
        <div className="flex flex-col gap-2.5">
          {clients.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface p-3.5"
            >
              <div>
                <p className="text-sm font-bold text-text-primary">{c.name}</p>
                <p className="font-mono text-xs text-text-primary/50">{c.apiKeyPrefix}…</p>
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
