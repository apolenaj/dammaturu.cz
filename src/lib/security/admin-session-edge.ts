/**
 * Admin session token helpers usable from Edge middleware (Web Crypto)
 * and Node (via admin-auth).
 */

const ADMIN_TOKEN_PAYLOAD = "dammaturu-admin-v1";

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function adminSecretFromEnv(): string | null {
  const fromEnv = process.env.ADMIN_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV !== "production") return "dev-admin-secret";
  return null;
}

export async function adminSessionToken(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(ADMIN_TOKEN_PAYLOAD),
  );
  return base64UrlEncode(sig);
}

export async function verifyAdminSessionCookie(
  raw: string | undefined | null,
  secret: string | null = adminSecretFromEnv(),
): Promise<boolean> {
  if (!raw || !secret) return false;
  const expected = await adminSessionToken(secret);
  return timingSafeEqualStr(raw, expected);
}
