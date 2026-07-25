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
import {
  GUEST_COOKIE_NAME,
  guestCookieOptions,
  mintGuestIdAndCookieValue,
  readGuestIdFromCookieHeader,
  verifyGuestCookieValue,
} from "@/server/guest/guest-cookie";

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

async function ensureGuestCookieOnResponse(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const existing =
    (await readGuestIdFromCookieHeader(request.headers.get("cookie"))) ??
    (await verifyCookieFromRequest(request));
  if (existing) return response;

  const { guestId, cookieValue } = await mintGuestIdAndCookieValue();
  const secure =
    process.env.NODE_ENV === "production" ||
    request.nextUrl.protocol === "https:";
  const options = guestCookieOptions(secure);

  // Make the new cookie visible to RSC on this same request (same pattern as Supabase SSR).
  request.cookies.set(GUEST_COOKIE_NAME, cookieValue);
  const next = NextResponse.next({
    request: { headers: request.headers },
  });
  // Preserve cookies already set on the Supabase refresh response.
  for (const cookie of response.cookies.getAll()) {
    next.cookies.set(cookie);
  }
  next.cookies.set(GUEST_COOKIE_NAME, cookieValue, options);
  // Pass guest id via request header for layout when cookie jar timing is flaky.
  next.headers.set("x-dm-guest-id", guestId);
  return next;
}

async function verifyCookieFromRequest(
  request: NextRequest,
): Promise<string | null> {
  return verifyGuestCookieValue(request.cookies.get(GUEST_COOKIE_NAME)?.value);
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
    pathname.startsWith("/registrace/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname.startsWith("/register/");
  const isPasswordUpdate =
    pathname === "/auth/nove-heslo" || pathname.startsWith("/auth/nove-heslo/");

  // Guest study mode: /app and /onboarding are open without auth.
  // Mint a stable guest cookie so learning stores can key progress.
  if ((isApp || isOnboarding) && !authenticated) {
    return ensureGuestCookieOnResponse(request, response);
  }

  if (isPasswordUpdate && configured && !authenticated) {
    const login = new URL("/login", request.url);
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
    const dest = safeInternalPath(next, "/prehled");
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
    "/login",
    "/login/:path*",
    "/register",
    "/register/:path*",
    "/prehled",
    "/prehled/:path*",
    "/auth/:path*",
  ],
};
