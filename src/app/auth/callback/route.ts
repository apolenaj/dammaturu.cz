import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { safeInternalPath } from "@/lib/security/hardening";

/**
 * Exchange auth code (magic link / OAuth / password recovery) for a session.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeInternalPath(
    url.searchParams.get("next"),
    "/app/dashboard",
  );

  const env = getSupabasePublicEnv();
  if (!env) {
    return NextResponse.redirect(
      new URL("/prihlaseni?reason=unavailable", url.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/prihlaseni?reason=expired", url.origin),
    );
  }

  const redirectTo = new URL(next, url.origin);
  const response = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchange failed", error.message);
    return NextResponse.redirect(
      new URL("/prihlaseni?reason=expired", url.origin),
    );
  }

  return response;
}
