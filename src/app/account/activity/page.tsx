import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { StatusDot } from "@/components/ui/StatusDot";
import { cn } from "@/lib/cn";

const SIGN_IN_ACTIONS = ["SIGN_IN", "SIGN_OUT"];

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const { filter } = await searchParams;
  const signinOnly = filter === "signin";

  const user = await db.user.findUnique({ where: { id: session.userId } });
  const orgScoped = user?.organizationId && ["BANK", "GOVERNMENT"].includes(user.role);

  const userIds = orgScoped
    ? (
        await db.user.findMany({
          where: { organizationId: user!.organizationId! },
          select: { id: true },
        })
      ).map((u) => u.id)
    : [session.userId];

  const activity = await db.activityLog.findMany({
    where: {
      userId: { in: userIds },
      ...(signinOnly ? { action: { in: SIGN_IN_ACTIONS } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <AppShell>
      <BackHeader title="Activity & History" href="/account" />
      <p className="-mt-3 text-xs font-medium text-text-primary/50">
        {orgScoped ? "Showing your activity and your organization's" : "Showing your activity"}
      </p>

      <div className="flex gap-2">
        {[
          { key: undefined, label: "All Activity" },
          { key: "signin", label: "Sign-in Activity" },
        ].map((tab) => (
          <Link
            key={tab.label}
            href={tab.key ? `/account/activity?filter=${tab.key}` : "/account/activity"}
            className={cn(
              "flex-1 rounded-full px-3 py-2.5 text-center text-xs font-semibold",
              (tab.key === "signin") === signinOnly
                ? "bg-brand text-white"
                : "bg-bg-surface-sunken text-text-primary"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col">
        {activity.length === 0 && (
          <p className="py-6 text-center text-sm text-text-primary/50">No activity yet.</p>
        )}
        {activity.map((item) => (
          <div key={item.id} className="flex items-start gap-3 border-b border-border-divider py-3">
            <StatusDot
              tone={
                item.action === "SIGN_IN"
                  ? "low"
                  : item.action === "INCIDENT_REPORTED"
                    ? "elevated"
                    : "neutral"
              }
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">
                {item.action.replace(/_/g, " ")}
              </p>
              <p className="text-xs font-medium text-text-primary/50">{item.description}</p>
              <p className="mt-0.5 text-2xs font-medium text-text-primary/40">
                {item.createdAt.toLocaleString("en-NG")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
