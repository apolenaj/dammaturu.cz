import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Refresh Supabase Auth session cookies for SSR ↔ browser sync.
 * Call from root `middleware.ts` on every matched request.
 *
 * Official pattern: createServerClient + getUser() (not getSession()) so the
 * access token is revalidated and cookies are rewritten when refreshed.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const env = getSupabasePublicEnv();
  if (!env) {
    return { response: supabaseResponse, user: null, configured: false as const };
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: Do not remove getUser() — it refreshes the Auth token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    response: supabaseResponse,
    user,
    configured: true as const,
  };
}
