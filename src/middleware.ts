import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function adminTokenExpected(): string | null {
  // Edge-compatible: use Web Crypto via SubtleCrypto would be heavier;
  // middleware only checks cookie presence + login page redirect.
  // Real verification happens in server actions / layout (Node).
  const secret =
    process.env.ADMIN_SECRET?.trim() ||
    (process.env.NODE_ENV !== "production" ? "dev-admin-secret" : "");
  return secret ? "configured" : null;
}

/** Interní showcase + admin gate (cookie presence; full verify in Node). */
export function middleware(request: NextRequest) {
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
    if (!adminTokenExpected()) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    const session = request.cookies.get("dm_admin_session")?.value;
    if (!session) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/design-system/:path*", "/admin/:path*"],
};
