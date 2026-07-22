/**
 * Edge-safe signed guest cookie (middleware + Node).
 * Signing prevents casual id forgery across browsers.
 */

import {
  createGuestLearnerId,
  isGuestLearnerId,
} from "@/server/guest/guest-id";
import { GUEST_COOKIE_NAME } from "@/domain/viewer/types";

export { GUEST_COOKIE_NAME };

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400; // ~400 days (Chromium cap)

function sessionSecret(): string {
  return (
    process.env.LEARNER_SESSION_SECRET ||
    process.env.ADMIN_SECRET ||
    "dev-learner-session"
  );
}

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i++) {
    binary += String.fromCharCode(view[i]!);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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
    ok |= expected.charCodeAt(i)! ^ sig.charCodeAt(i)!;
  }
  return ok === 0;
}

/** Cookie value: `guestId.signature` */
export async function signGuestCookieValue(guestId: string): Promise<string> {
  if (!isGuestLearnerId(guestId)) {
    throw new Error("Neplatné guest id");
  }
  const sig = await hmacSign(guestId);
  return `${guestId}.${sig}`;
}

export async function verifyGuestCookieValue(
  raw: string | undefined | null,
): Promise<string | null> {
  if (!raw) return null;
  const trimmed = raw.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return null;
  const guestId = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  if (!isGuestLearnerId(guestId)) return null;
  if (!(await hmacVerify(guestId, sig))) return null;
  return guestId;
}

export function guestCookieOptions(secure: boolean): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SEC,
  };
}

export async function readGuestIdFromCookieHeader(
  cookieHeader: string | null,
): Promise<string | null> {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [name, ...rest] = part.trim().split("=");
    if (name === GUEST_COOKIE_NAME) {
      const value = decodeURIComponent(rest.join("=").trim());
      return verifyGuestCookieValue(value);
    }
  }
  return null;
}

export async function mintGuestIdAndCookieValue(): Promise<{
  guestId: string;
  cookieValue: string;
}> {
  const guestId = createGuestLearnerId();
  const cookieValue = await signGuestCookieValue(guestId);
  return { guestId, cookieValue };
}
