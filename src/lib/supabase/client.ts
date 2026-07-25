"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Browser Supabase client for Client Components.
 * Official App Router pattern via `@supabase/ssr` `createBrowserClient`.
 */
export function createClient() {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      "Supabase není nakonfigurován. Nastav NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY v .env.local.",
    );
  }
  return createBrowserClient(env.url, env.anonKey);
}

/** @deprecated Prefer `createClient` — kept for existing call sites. */
export function createSupabaseBrowserClient() {
  return createClient();
}
