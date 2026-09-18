import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABEL } from "@/lib/auth/roles";
import type { WeeklySignups } from "@/lib/owner/dashboard-data";
import { SIGNUP_ROLES } from "@/lib/owner/dashboard-data";

const SERIES_CLASS: Record<Role, string> = {
  CITIZEN: "bg-chart-series-1",
  BUSINESS: "bg-chart-series-2",
  BANK: "bg-chart-series-3",
  GOVERNMENT: "bg-chart-series-4",
  DEVELOPER: "bg-chart-series-5",
  ADMIN: "",
  PLATFORM_OWNER: "",
};

function weekTotal(week: WeeklySignups) {
  return SIGNUP_ROLES.reduce((sum, r) => sum + week.counts[r], 0);
}

export function SignupsChart({ weeks }: { weeks: WeeklySignups[] }) {
  const maxTotal = Math.max(1, ...weeks.map(weekTotal));

  return (
    <div className="flex flex-col gap-4">
      {/* Legend — identity is never color-alone. */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {SIGNUP_ROLES.map((role) => (
          <span key={role} className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
            <span className={`h-2.5 w-2.5 rounded-full ${SERIES_CLASS[role]}`} />
            {ROLE_LABEL[role]}
          </span>
        ))}
      </div>

      {/* Stacked weekly bars. Native title attrs give a lightweight hover
          disclosure per segment without a client-side tooltip component. */}
      <div className="flex h-40 items-end gap-1.5">
        {weeks.map((week) => {
          const total = weekTotal(week);
          const heightPct = total === 0 ? 0 : Math.max(4, (total / maxTotal) * 100);
          return (
            <div key={week.weekStart} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-t"
                style={{ height: `${heightPct}%`, minHeight: total > 0 ? "4px" : 0 }}
              >
                {SIGNUP_ROLES.map((role) => {
                  const count = week.counts[role];
                  if (count === 0) return null;
                  const segPct = (count / total) * 100;
                  return (
                    <div
                      key={role}
                      title={`${ROLE_LABEL[role]}: ${count}`}
                      className={`${SERIES_CLASS[role]} w-full border-b-2 border-bg-surface last:border-b-0`}
                      style={{ height: `${segPct}%` }}
                    />
                  );
                })}
              </div>
              <span className="text-2xs font-medium text-text-primary/40">
                {new Date(week.weekStart).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Table view — the data behind the chart, always available. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-divider text-left text-text-primary/50">
              <th className="py-1.5 pr-3 font-semibold">Week of</th>
              {SIGNUP_ROLES.map((role) => (
                <th key={role} className="py-1.5 pr-3 font-semibold">
                  {ROLE_LABEL[role]}
                </th>
              ))}
              <th className="py-1.5 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.weekStart} className="border-b border-border-divider">
                <td className="py-1.5 pr-3 text-text-primary/70">
                  {new Date(week.weekStart).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                </td>
                {SIGNUP_ROLES.map((role) => (
                  <td key={role} className="py-1.5 pr-3 text-text-primary">
                    {week.counts[role]}
                  </td>
                ))}
                <td className="py-1.5 font-semibold text-text-primary">{weekTotal(week)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
