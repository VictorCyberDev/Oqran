import { db } from "@/lib/db";
import { requireOrgLead } from "@/lib/auth/org-guard";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { Card } from "@/components/ui/Card";
import { InviteMemberForm } from "@/components/org/InviteMemberForm";
import { TeamMembersList } from "@/components/org/TeamMembersList";

export default async function BankTeamPage() {
  const lead = await requireOrgLead(["BANK"]);

  const members = await db.user.findMany({
    where: { organizationId: lead.organizationId! },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell>
      <BackHeader title="Team Management" href="/bank" />
      <p className="-mt-3 text-xs font-medium text-text-primary/50">
        Invite or remove staff in your organization — this doesn&rsquo;t go through platform review.
      </p>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text-primary">Invite a teammate</h2>
        <InviteMemberForm />
      </Card>

      <div>
        <h2 className="mb-2 text-md font-bold text-text-primary">
          Members ({members.length})
        </h2>
        <TeamMembersList members={members} currentUserId={lead.id} />
      </div>
    </AppShell>
  );
}
