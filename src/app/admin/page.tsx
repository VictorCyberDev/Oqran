import Link from "next/link";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { RoleHeader } from "@/components/layout/RoleHeader";
import { Badge } from "@/components/ui/Badge";

export default async function AdminHome() {
  const pendingCount = await db.pendingApproval.count({ where: { status: "PENDING" } });

  const links = [
    {
      href: "/admin/access",
      title: "Access & Role Management",
      desc: "Review bank/government signups awaiting approval.",
      badge: pendingCount > 0 ? String(pendingCount) : undefined,
    },
    {
      href: "/admin/compliance",
      title: "Compliance & Data Governance",
      desc: "Address-verification provenance and organization status.",
    },
    {
      href: "/admin/ledger",
      title: "Audit Ledger",
      desc: "Hash-chain integrity of every recorded platform action.",
    },
  ];

  return (
    <AppShell>
      <RoleHeader roleLabel="Admin" initial="A" />
      <h1 className="text-3xl font-bold text-text-primary">Platform Administration</h1>
      <div className="flex flex-col gap-2.5">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-bg-surface p-4"
          >
            <div>
              <p className="text-md font-bold text-text-primary">{l.title}</p>
              <p className="mt-0.5 text-xs font-medium text-text-primary/50">{l.desc}</p>
            </div>
            {l.badge && <Badge tone="critical">{l.badge}</Badge>}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
