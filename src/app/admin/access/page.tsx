import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ApprovalActions } from "@/components/admin/ApprovalActions";

export default async function AccessManagementPage() {
  const approvals = await db.pendingApproval.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: true, organization: true },
  });

  return (
    <AppShell>
      <BackHeader title="Access & Role Management" href="/admin" />
      <p className="-mt-3 text-xs font-medium text-text-primary/50">
        {approvals.length} pending approval{approvals.length === 1 ? "" : "s"}
      </p>

      {approvals.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-primary/50">Nothing waiting on review.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {approvals.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-md font-bold text-text-primary">{a.user.email}</span>
                <Badge tone="brand">{a.requestedRole}</Badge>
              </div>
              <div className="flex flex-col gap-1 text-xs font-medium text-text-primary/55">
                <span>Reference {a.referenceCode}</span>
                {a.organization && <span>Organization: {a.organization.name}</span>}
                {a.user.nin && <span>NIN: {a.user.nin}</span>}
                <span>Submitted {a.createdAt.toLocaleString("en-NG")}</span>
              </div>
              <ApprovalActions approvalId={a.id} />
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
