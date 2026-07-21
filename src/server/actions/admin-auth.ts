"use server";

import { redirect } from "next/navigation";
import {
  assertAdmin,
  isAdminAuthenticated,
  loginAdmin,
  logoutAdmin,
} from "@/server/admin-auth";

export async function adminLoginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  const safeNext = next.startsWith("/admin") ? next : "/admin";
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
