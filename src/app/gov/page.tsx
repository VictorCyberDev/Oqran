import { db } from "@/lib/db";
import { daysAgo } from "@/lib/dates";
import { GovDashboardClient } from "@/components/gov/GovDashboardClient";

export default async function GovSpatialGridPage() {
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
      incidents={incidents.map((i) => ({
        ...i,
        latitude: i.latitude!,
        longitude: i.longitude!,
        createdAt: i.createdAt.toISOString(),
      }))}
    />
  );
}
