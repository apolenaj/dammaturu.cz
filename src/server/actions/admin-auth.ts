"use server";

import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/security/hardening";
import {
  assertAdmin,
  isAdminAuthenticated,
  loginAdmin,
  logoutAdmin,
} from "@/server/admin-auth";
import {
  clientIpFromHeaders,
  rateLimit,
} from "@/server/security/rate-limit";
import { headers } from "next/headers";

export async function adminLoginAction(formData: FormData): Promise<void> {
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  const limited = rateLimit({
    key: `auth:admin:${ip}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    redirect(
      `/admin/login?error=${encodeURIComponent("Příliš mnoho pokusů. Chvíli počkej.")}`,
    );
  }

  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin/content");
  const safeNext = safeInternalPath(
    next.startsWith("/admin") ? next : "/admin/content",
    "/admin/content",
  );
  const result = await loginAdmin(password);
  if (!result.ok) {
    redirect(
      `/admin/login?error=${encodeURIComponent(result.error)}&next=${encodeURIComponent(safeNext)}`,
    );
  }
  redirect(safeNext);
}

export async function adminLogoutAction(): Promise<void> {
  await logoutAdmin();
  redirect("/admin/login");
}

export async function requireAdminAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  return assertAdmin();
}

export async function getAdminAuthStateAction(): Promise<{
  authenticated: boolean;
}> {
  return { authenticated: await isAdminAuthenticated() };
}
