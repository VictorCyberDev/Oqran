import { Badge } from "@/components/ui/Badge";
import { RemoveMemberButton } from "@/components/org/RemoveMemberButton";

export interface TeamMember {
  id: string;
  email: string | null;
  displayName: string | null;
  status: string;
  orgRole: string;
  createdAt: Date;
}

export function TeamMembersList({
  members,
  currentUserId,
  compact = false,
}: {
  members: TeamMember[];
  currentUserId: string;
  compact?: boolean;
}) {
  if (members.length === 0) {
    return <p className="py-4 text-center text-sm text-text-primary/50">No team members yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map((m) => (
        <div
          key={m.id}
          className={`flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-surface ${compact ? "p-3" : "p-4"}`}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-text-primary">
                {m.displayName ?? m.email}
              </span>
              {m.orgRole === "LEAD" && <Badge tone="brand">Lead</Badge>}
            </div>
            <p className="mt-0.5 text-xs font-medium text-text-primary/50">
              {m.email} · {m.status === "ACTIVE" ? "Active" : m.status.replace(/_/g, " ")} · joined{" "}
              {m.createdAt.toLocaleDateString("en-NG")}
            </p>
          </div>
          {m.id !== currentUserId && m.status === "ACTIVE" && <RemoveMemberButton userId={m.id} />}
        </div>
      ))}
    </div>
  );
}
