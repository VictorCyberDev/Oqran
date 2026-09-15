import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { THEME_COOKIE, isThemePreference } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "OQRAN",
  description: "Verify. Assess. Protect. Nigeria's spatial risk-intelligence platform.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8c1b2e",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const rawTheme = cookieStore.get(THEME_COOKIE)?.value;
  const theme = isThemePreference(rawTheme) ? rawTheme : "system";
  const dataTheme = theme === "system" ? undefined : theme;

  return (
    <html lang="en" data-theme={dataTheme} className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
