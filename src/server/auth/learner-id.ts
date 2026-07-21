/**
 * Map Supabase auth.users.id (UUID) → stable learner file-store id.
 * Hyphens stripped so ids stay within safe-id charset / path rules.
 */
export function authUserIdToLearnerId(userId: string): string {
  const normalized = userId.trim().toLowerCase().replace(/-/g, "");
  if (!/^[a-f0-9]{32}$/.test(normalized)) {
    throw new Error("Neplatné user id");
  }
  return normalized;
}

export function isAuthLearnerId(id: string): boolean {
  return /^[a-f0-9]{32}$/.test(id);
}
