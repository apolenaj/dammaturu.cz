import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  adminSecretFromEnv,
  verifyAdminSessionCookie,
} from "@/lib/security/admin-session-edge";
import { safeInternalPath } from "@/lib/security/hardening";
import {
  isLocalDevAuthEnabled,
  readLocalAuthFromCookieHeader,
} from "@/server/auth/local-auth-cookie";

async function hasLearnerAuth(
  request: NextRequest,
  supabaseUser: unknown,
): Promise<boolean> {
  if (supabaseUser) return true;
  if (!isLocalDevAuthEnabled()) return false;
  return Boolean(
    await readLocalAuthFromCookieHeader(request.headers.get("cookie")),
  );
}

function authSystemAvailable(): boolean {
  return isSupabaseConfigured() || isLocalDevAuthEnabled();
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    process.env.NODE_ENV === "production" &&
    pathname.startsWith("/design-system")
  ) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
      return NextResponse.next();
    }
    const secret = adminSecretFromEnv();
    if (!secret) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    const session = request.cookies.get("dm_admin_session")?.value;
    const valid = await verifyAdminSessionCookie(session, secret);
    if (!valid) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", safeInternalPath(pathname, "/admin/content"));
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  const authenticated = await hasLearnerAuth(request, user);
  const configured = authSystemAvailable();

  const isApp = pathname.startsWith("/app");
  const isOnboarding =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  const isAuthPage =
    pathname === "/prihlaseni" ||
    pathname.startsWith("/prihlaseni/") ||
    pathname === "/registrace" ||
    pathname.startsWith("/registrace/");
  const isPasswordUpdate =
    pathname === "/auth/nove-heslo" || pathname.startsWith("/auth/nove-heslo/");

  if ((isApp || isOnboarding) && !configured) {
    const login = new URL("/prihlaseni", request.url);
    login.searchParams.set("reason", "unavailable");
    return NextResponse.redirect(login);
  }

  if ((isApp || isOnboarding) && configured && !authenticated) {
    const login = new URL("/prihlaseni", request.url);
    login.searchParams.set("next", safeInternalPath(pathname));
    login.searchParams.set("reason", "session");
    return NextResponse.redirect(login);
  }

  if (isPasswordUpdate && configured && !authenticated) {
    const login = new URL("/prihlaseni", request.url);
    login.searchParams.set("reason", "expired");
    login.searchParams.set("next", "/auth/nove-heslo");
    return NextResponse.redirect(login);
  }

  if (
    isAuthPage &&
    configured &&
    authenticated &&
    !request.nextUrl.searchParams.get("stay")
  ) {
    const next = request.nextUrl.searchParams.get("next");
    const dest = safeInternalPath(next, "/app/dashboard");
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/design-system/:path*",
    "/admin/:path*",
    "/app/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/prihlaseni",
    "/prihlaseni/:path*",
    "/registrace",
    "/registrace/:path*",
    "/auth/:path*",
  ],
};
