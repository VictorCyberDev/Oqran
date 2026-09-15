import Link from "next/link";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { roleHomePath, ROLE_LABEL } from "@/lib/auth/roles";
import { THEME_COOKIE, isThemePreference } from "@/lib/theme";
import { AppShell } from "@/components/layout/AppShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SignOutButton } from "@/components/theme/SignOutButton";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) return null;

  const [user, cookieStore] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId } }),
    cookies(),
  ]);
  if (!user) return null;

  const rawTheme = cookieStore.get(THEME_COOKIE)?.value;
  const theme = isThemePreference(rawTheme) ? rawTheme : "system";
  const name = user.displayName ?? user.phone ?? user.email ?? "User";

  return (
    <AppShell>
      <BackHeader title="Account" href={roleHomePath(user.role)} />

      <Card className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-md font-bold text-brand">
          {name[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-md font-bold text-text-primary">{name}</p>
          <p className="text-xs font-medium text-text-primary/50">
            {ROLE_LABEL[user.role]} · One unified profile
          </p>
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        <Link
          href="/account/devices"
          className="rounded-lg border border-border-subtle bg-bg-surface px-4 py-4 text-sm font-semibold text-text-primary"
        >
          Trusted Devices
        </Link>
        <Link
          href="/account/activity"
          className="rounded-lg border border-border-subtle bg-bg-surface px-4 py-4 text-sm font-semibold text-text-primary"
        >
          Activity &amp; History
        </Link>
        <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-surface px-4 py-4">
          <span className="text-sm font-semibold text-text-primary">Appearance</span>
          <ThemeToggle initial={theme} />
        </div>
      </div>

      <SignOutButton />
    </AppShell>
  );
}
