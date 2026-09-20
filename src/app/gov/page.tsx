import { db } from "@/lib/db";
import { daysAgo } from "@/lib/dates";
import { getSession } from "@/lib/auth/session";
import { GovDashboardClient } from "@/components/gov/GovDashboardClient";

export default async function GovSpatialGridPage() {
  const session = await getSession();
  const viewer = session
    ? await db.user.findUnique({ where: { id: session.userId } })
    : null;
  const isLead = viewer?.orgRole === "LEAD" && !!viewer.organizationId;

  const [openCases, bankCases] = await Promise.all([
    db.case.count({ where: { status: { not: "RESOLVED" } } }),
    db.case.count({ where: { status: { not: "RESOLVED" }, source: "BANK_ESCALATION" } }),
  ]);

  const incidents = await db.incident.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      createdAt: { gte: daysAgo(180) },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      type: true,
      severity: true,
      latitude: true,
      longitude: true,
      status: true,
      createdAt: true,
      address: { select: { label: true } },
    },
  });

  return (
    <GovDashboardClient
      isLead={isLead}
      openCases={openCases}
      bankCases={bankCases}
      incidents={incidents.map((i) => ({
        ...i,
        latitude: i.latitude!,
        longitude: i.longitude!,
        createdAt: i.createdAt.toISOString(),
      }))}
    />
  );
}
