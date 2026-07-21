import { createHmac, timingSafeEqual } from "node:crypto";

/** Learner / file-store id: alphanumeric + _ - only (blocks path traversal). */
const SAFE_ID = /^[a-zA-Z0-9_-]{1,64}$/;

export function assertSafeId(id: string, label = "id"): string {
  if (!SAFE_ID.test(id)) {
    throw new Error(`Neplatné ${label}`);
  }
  return id;
}

export function isSafeId(id: string | undefined | null): id is string {
  return typeof id === "string" && SAFE_ID.test(id);
}

function sessionSecret(): string {
  return (
    process.env.LEARNER_SESSION_SECRET ||
    process.env.ADMIN_SECRET ||
    (process.env.NODE_ENV === "production" ? "" : "dev-learner-session")
  );
}

/** Signed cookie payload: id.signature */
export function signLearnerId(id: string): string {
  const safe = assertSafeId(id, "learner id");
  const secret = sessionSecret();
  if (!secret) {
    throw new Error("LEARNER_SESSION_SECRET / ADMIN_SECRET chybí");
  }
  const sig = createHmac("sha256", secret).update(safe).digest("base64url");
  return `${safe}.${sig}`;
}

export function verifyLearnerCookie(
  raw: string | undefined,
): string | undefined {
  if (!raw) return undefined;
  const secret = sessionSecret();
  if (!secret) return undefined;

  // Legacy unsigned cookie (migration): accept only safe ids in non-prod
  if (!raw.includes(".")) {
    if (process.env.NODE_ENV === "production") return undefined;
    return isSafeId(raw) ? raw : undefined;
  }

  const dot = raw.lastIndexOf(".");
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!isSafeId(id) || !sig) return undefined;

  const expected = createHmac("sha256", secret).update(id).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return undefined;
  } catch {
    return undefined;
  }
  return id;
}
