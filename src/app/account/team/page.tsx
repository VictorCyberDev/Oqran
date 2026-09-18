import { db } from "@/lib/db";
import { requireOrgLead } from "@/lib/auth/org-guard";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { InviteMemberForm } from "@/components/org/InviteMemberForm";
import { TeamMembersList } from "@/components/org/TeamMembersList";

export default async function BusinessTeamPage() {
  const lead = await requireOrgLead(["BUSINESS"]);

  const members = await db.user.findMany({
    where: { organizationId: lead.organizationId! },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell>
      <BackHeader title="Team Members" href="/account" />
      <p className="-mt-3 text-xs font-medium text-text-primary/50">
        Add or remove people on your account — no admin review needed.
      </p>
      <InviteMemberForm compact />
      <TeamMembersList members={members} currentUserId={lead.id} compact />
    </AppShell>
  );
}
