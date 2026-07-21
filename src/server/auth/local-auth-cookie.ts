/**
 * Edge-safe local auth cookie helpers (no fs / no node:crypto).
 * Used by middleware + shared with Node local-dev-auth via same secret/algorithm.
 */

export const LOCAL_AUTH_COOKIE = "dm_local_auth";

export function isLocalDevAuthEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.AUTH_DEV_ENABLED === "false") return false;
  if (process.env.AUTH_DEV_ENABLED === "true") return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return !url || !key || url.includes("YOUR_PROJECT") || key.includes("YOUR_ANON");
}

function sessionSecret(): string {
  return (
    process.env.LEARNER_SESSION_SECRET ||
    process.env.ADMIN_SECRET ||
    "dev-learner-session"
  );
}

export type LocalAuthPayload = {
  sub: string;
  email: string;
  purpose: "session" | "reset";
  exp: number;
};

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i++) {
    binary += String.fromCharCode(view[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hmacSign(body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return bytesToBase64Url(sig);
}

async function hmacVerify(body: string, sig: string): Promise<boolean> {
  const expected = await hmacSign(body);
  if (expected.length !== sig.length) return false;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) {
    ok |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return ok === 0;
}

export async function signLocalAuthPayload(
  payload: LocalAuthPayload,
): Promise<string> {
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmacSign(body);
  return `${body}.${sig}`;
}

export async function verifyLocalAuthPayload(
  raw: string | undefined,
): Promise<LocalAuthPayload | null> {
  if (!raw || !raw.includes(".")) return null;
  const dot = raw.lastIndexOf(".");
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!body || !sig) return null;
  if (!(await hmacVerify(body, sig))) return null;
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(body));
    const payload = JSON.parse(json) as LocalAuthPayload;
    if (payload.exp < Date.now()) return null;
    if (payload.purpose !== "session" && payload.purpose !== "reset") return null;
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function readLocalAuthFromCookieHeader(
  cookieHeader: string | null,
): Promise<{ userId: string; email: string } | null> {
  if (!isLocalDevAuthEnabled()) return null;
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${LOCAL_AUTH_COOKIE}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.slice(LOCAL_AUTH_COOKIE.length + 1));
  const payload = await verifyLocalAuthPayload(value);
  if (!payload || payload.purpose !== "session") return null;
  return { userId: payload.sub, email: payload.email };
}
