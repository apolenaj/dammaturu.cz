import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "dm_admin_session";

function adminSecret(): string | null {
  const fromEnv = process.env.ADMIN_SECRET?.trim();
  if (fromEnv) return fromEnv;
  // Local/dev only — production must set ADMIN_SECRET
  if (process.env.NODE_ENV !== "production") return "dev-admin-secret";
  return null;
}

function tokenForSecret(secret: string): string {
  return createHmac("sha256", secret).update("dammaturu-admin-v1").digest("base64url");
}

export function isAdminConfigured(): boolean {
  return adminSecret() != null;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = adminSecret();
  if (!secret) return false;
  const jar = await cookies();
  const raw = jar.get(ADMIN_COOKIE)?.value;
  if (!raw) return false;
  const expected = tokenForSecret(secret);
  try {
    const a = Buffer.from(raw);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Throws / returns error shape for server actions. */
export async function assertAdmin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!adminSecret()) {
    return {
      ok: false,
      error: "Admin není nakonfigurovaný (chybí ADMIN_SECRET).",
    };
  }
  if (!(await isAdminAuthenticated())) {
    return { ok: false, error: "Nejsi přihlášen/a jako admin." };
  }
  return { ok: true };
}

export async function loginAdmin(password: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const secret = adminSecret();
  if (!secret) {
    return {
      ok: false,
      error: "Admin není nakonfigurovaný (chybí ADMIN_SECRET).",
    };
  }
  const a = Buffer.from(password);
  const b = Buffer.from(secret);
  if (a.length !== b.length) {
    return { ok: false, error: "Neplatné heslo." };
  }
  if (!timingSafeEqual(a, b)) {
    return { ok: false, error: "Neplatné heslo." };
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, tokenForSecret(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return { ok: true };
}

export async function logoutAdmin(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}
