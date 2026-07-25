/** Cesty chráněného studijního dashboardu (bez route group v URL). */
export const DASHBOARD_PATH_PREFIXES = [
  "/prehled",
  "/uceni",
  "/moje-chyby",
  "/materialy",
  "/plan",
  "/statistiky",
] as const;

export function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
