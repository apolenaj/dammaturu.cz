import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Server Supabase client for Server Components, Server Actions, and Route Handlers.
 * Official App Router pattern via `@supabase/ssr` `createServerClient` + cookies.
 */
export async function createClient() {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      "Supabase není nakonfigurován. Nastav NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY v .env.local.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — middleware refreshSession handles writes.
        }
      },
    },
  });
}

/** @deprecated Prefer `createClient` — kept for existing call sites. */
export async function createSupabaseServerClient() {
  return createClient();
}
