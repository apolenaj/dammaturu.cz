/**
 * Public Supabase env — required for Auth.
 * Never put service-role keys in NEXT_PUBLIC_*.
 */

export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  if (url.includes("YOUR_PROJECT") || anonKey.includes("YOUR_ANON")) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicEnv() !== null;
}

/** Google OAuth button — only when project has Google provider enabled. */
export function isGoogleAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true";
}

export function isMagicLinkEnabled(): boolean {
  // Default on when Supabase is configured; can disable with =false
  if (!isSupabaseConfigured()) return false;
  return process.env.NEXT_PUBLIC_AUTH_MAGIC_LINK !== "false";
}

export function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}
