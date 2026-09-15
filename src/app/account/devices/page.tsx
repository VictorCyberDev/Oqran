import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getTrustedDeviceForUser } from "@/lib/auth/device-trust";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RemoveDeviceButton } from "@/components/account/RemoveDeviceButton";

export default async function TrustedDevicesPage() {
  const session = await getSession();
  if (!session) return null;

  const [devices, currentDevice] = await Promise.all([
    db.trustedDevice.findMany({
      where: { userId: session.userId, revokedAt: null },
      orderBy: { lastUsedAt: "desc" },
    }),
    getTrustedDeviceForUser(session.userId),
  ]);

  return (
    <AppShell>
      <BackHeader title="Trusted Devices" href="/account" />
      <p className="-mt-3 text-xs font-medium text-text-primary/50">
        Removing a device requires full verification on its next sign-in
      </p>

      {devices.length === 0 ? (
        <p className="text-sm text-text-primary/50">No trusted devices yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {devices.map((d) => (
            <Card key={d.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-text-primary">{d.label}</span>
                {currentDevice?.id === d.id && <Badge tone="low">This device</Badge>}
              </div>
              <span className="text-xs font-medium text-text-primary/50">
                {d.approxLocation ?? "Location unknown"} · Last active{" "}
                {d.lastUsedAt.toLocaleDateString("en-NG")}
              </span>
              <RemoveDeviceButton deviceId={d.id} />
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
