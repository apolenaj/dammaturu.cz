"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error("Supabase není nakonfigurován.");
  }
  return createBrowserClient(env.url, env.anonKey);
}
