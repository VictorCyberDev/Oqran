import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { StreetCheckPanel } from "@/components/citizen/StreetCheckPanel";

export default async function StreetCheckPage() {
  // Real places from the dataset, so the screen is useful before the
  // person has typed anything.
  const suggestions = await db.address.findMany({
    select: { label: true },
    orderBy: { updatedAt: "desc" },
    take: 4,
  });

  return (
    <AppShell>
      <BackHeader title="Check a place" href="/citizen" />
      <StreetCheckPanel suggestions={suggestions.map((s) => s.label)} />
    </AppShell>
  );
}
