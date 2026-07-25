/**
 * Public Supabase env — required for Auth.
 * Never put service-role keys in NEXT_PUBLIC_*.
 */

export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

const PLACEHOLDER_URLS = new Set([
  "tvoje-url",
  "supabase_project_url",
  "https://YOUR_PROJECT.supabase.co",
]);

const PLACEHOLDER_KEYS = new Set([
  "tvuj-anon-key",
  "YOUR_ANON_KEY",
  "supabase_publishable_key",
]);

function isPlaceholderUrl(url: string): boolean {
  if (PLACEHOLDER_URLS.has(url)) return true;
  if (url.includes("YOUR_PROJECT")) return true;
  if (!/^https?:\/\//i.test(url)) return true;
  return false;
}

function isPlaceholderKey(key: string): boolean {
  if (PLACEHOLDER_KEYS.has(key)) return true;
  if (key.includes("YOUR_ANON")) return true;
  if (key.includes("tvuj-anon")) return true;
  return false;
}

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!rawUrl || !anonKey) return null;
  const url = normalizeSupabaseUrl(rawUrl);
  if (isPlaceholderUrl(url) || isPlaceholderKey(anonKey)) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicEnv() !== null;
}

/** Diagnostika pro Auth UI / Server Actions (bez úniku celého klíče). */
export function getSupabaseConfigDiagnostics(): {
  configured: boolean;
  hasUrl: boolean;
  hasAnonKey: boolean;
  urlHost: string | null;
} {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const env = getSupabasePublicEnv();
  let urlHost: string | null = null;
  try {
    urlHost = env ? new URL(env.url).host : rawUrl ? new URL(normalizeSupabaseUrl(rawUrl)).host : null;
  } catch {
    urlHost = null;
  }
  return {
    configured: env !== null,
    hasUrl: Boolean(rawUrl),
    hasAnonKey: Boolean(anonKey),
    urlHost,
  };
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
