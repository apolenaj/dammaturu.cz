import { cookies } from "next/headers";
import {
  GUEST_COOKIE_NAME,
  guestCookieOptions,
  mintGuestIdAndCookieValue,
  signGuestCookieValue,
  verifyGuestCookieValue,
} from "@/server/guest/guest-cookie";
import { isGuestLearnerId } from "@/server/guest/guest-id";

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function readGuestIdFromCookies(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(GUEST_COOKIE_NAME)?.value;
  return verifyGuestCookieValue(raw);
}

export async function writeGuestIdCookie(guestId: string): Promise<void> {
  if (!isGuestLearnerId(guestId)) {
    throw new Error("Neplatné guest id");
  }
  const jar = await cookies();
  const value = await signGuestCookieValue(guestId);
  jar.set(GUEST_COOKIE_NAME, value, guestCookieOptions(cookieSecure()));
}

/** Create a new guest id and set the cookie (Server Action / Route Handler). */
export async function mintAndSetGuestCookie(): Promise<string> {
  const { guestId, cookieValue } = await mintGuestIdAndCookieValue();
  const jar = await cookies();
  jar.set(GUEST_COOKIE_NAME, cookieValue, guestCookieOptions(cookieSecure()));
  return guestId;
}

/**
 * Resolve guest id: cookie → else mint.
 * Prefer `preferredId` (from localStorage) when cookie missing or when restoring.
 */
export async function resolveOrCreateGuestId(
  preferredId?: string | null,
): Promise<string> {
  const fromCookie = await readGuestIdFromCookies();
  if (
    preferredId &&
    isGuestLearnerId(preferredId) &&
    (!fromCookie || fromCookie !== preferredId)
  ) {
    // Restore stable browser identity from localStorage when cookie was cleared
    // or when middleware minted a fresh id on this request.
    if (!fromCookie || preferredId !== fromCookie) {
      await writeGuestIdCookie(preferredId);
      return preferredId;
    }
  }
  if (fromCookie) return fromCookie;
  if (preferredId && isGuestLearnerId(preferredId)) {
    await writeGuestIdCookie(preferredId);
    return preferredId;
  }
  return mintAndSetGuestCookie();
}
