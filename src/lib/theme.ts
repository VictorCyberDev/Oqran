export const THEME_COOKIE = "oqran-theme";
export type ThemePreference = "light" | "dark" | "system";

export function isThemePreference(value: string | undefined): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/** Client-only: persists the choice and updates the live DOM without a reload. */
export function applyThemePreference(value: ThemePreference) {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE}=${value}; path=/; max-age=${oneYear}; SameSite=Lax`;
  if (value === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", value);
  }
}
