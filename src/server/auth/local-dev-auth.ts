import { randomUUID, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { authUserIdToLearnerId } from "@/server/auth/learner-id";
import {
  LOCAL_AUTH_COOKIE,
  isLocalDevAuthEnabled,
  signLocalAuthPayload,
  verifyLocalAuthPayload,
} from "@/server/auth/local-auth-cookie";

export {
  LOCAL_AUTH_COOKIE,
  isLocalDevAuthEnabled,
  readLocalAuthFromCookieHeader,
} from "@/server/auth/local-auth-cookie";

/**
 * Local file-backed Auth for development when Supabase env is missing.
 * NEVER enabled in production (see isLocalDevAuthEnabled).
 */

type LocalUser = {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data", "auth-local");

function emailKey(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function fileForEmail(email: string): string {
  return path.join(DATA_DIR, `${emailKey(email)}.json`);
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("base64url");
}

function verifyPassword(password: string, salt: string, expected: string): boolean {
  const got = hashPassword(password, salt);
  try {
    const a = Buffer.from(got);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function localSignUp(email: string, password: string): Promise<
  | { ok: true; userId: string; email: string }
  | { ok: false; code: "existing_account" | "error"; error: string }
> {
  await ensureDir();
  const normalized = email.trim().toLowerCase();
  try {
    await fs.access(fileForEmail(normalized));
    return {
      ok: false,
      code: "existing_account",
      error: "Účet s tímto e-mailem už existuje. Přihlas se nebo obnov heslo.",
    };
  } catch {
    // continue
  }

  const salt = randomUUID();
  const user: LocalUser = {
    id: randomUUID(),
    email: normalized,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(fileForEmail(normalized), `${JSON.stringify(user, null, 2)}\n`);
  return { ok: true, userId: user.id, email: user.email };
}

export async function localSignIn(email: string, password: string): Promise<
  | { ok: true; userId: string; email: string }
  | { ok: false; code: "invalid_credentials" | "error"; error: string }
> {
  const normalized = email.trim().toLowerCase();
  try {
    const raw = await fs.readFile(fileForEmail(normalized), "utf8");
    const user = JSON.parse(raw) as LocalUser;
    if (!verifyPassword(password, user.salt, user.passwordHash)) {
      return {
        ok: false,
        code: "invalid_credentials",
        error: "Neplatný e-mail nebo heslo.",
      };
    }
    return { ok: true, userId: user.id, email: user.email };
  } catch {
    return {
      ok: false,
      code: "invalid_credentials",
      error: "Neplatný e-mail nebo heslo.",
    };
  }
}

export async function localRequestPasswordReset(email: string): Promise<{
  ok: true;
  resetToken: string | null;
}> {
  const normalized = email.trim().toLowerCase();
  try {
    const raw = await fs.readFile(fileForEmail(normalized), "utf8");
    const user = JSON.parse(raw) as LocalUser;
    const token = await signLocalAuthPayload({
      sub: user.id,
      email: user.email,
      purpose: "reset",
      exp: Date.now() + 60 * 60 * 1000,
    });
    return { ok: true, resetToken: token };
  } catch {
    return { ok: true, resetToken: null };
  }
}

export async function localUpdatePasswordWithSession(
  userId: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const users = await listLocalUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return { ok: false, error: "Session vypršela. Požádej o nový odkaz." };
  const salt = randomUUID();
  const next: LocalUser = {
    ...user,
    salt,
    passwordHash: hashPassword(password, salt),
  };
  await fs.writeFile(fileForEmail(user.email), `${JSON.stringify(next, null, 2)}\n`);
  return { ok: true };
}

async function listLocalUsers(): Promise<LocalUser[]> {
  await ensureDir();
  const names = await fs.readdir(DATA_DIR);
  const out: LocalUser[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, name), "utf8");
      out.push(JSON.parse(raw) as LocalUser);
    } catch {
      // skip
    }
  }
  return out;
}

export async function setLocalAuthCookie(userId: string, email: string): Promise<void> {
  const token = await signLocalAuthPayload({
    sub: userId,
    email,
    purpose: "session",
    exp: Date.now() + 1000 * 60 * 60 * 24 * 365,
  });
  const jar = await cookies();
  jar.set(LOCAL_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearLocalAuthCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(LOCAL_AUTH_COOKIE);
}

export async function getLocalAuthIdentity(): Promise<{
  userId: string;
  learnerId: string;
  email: string;
} | null> {
  if (!isLocalDevAuthEnabled()) return null;
  const jar = await cookies();
  const payload = await verifyLocalAuthPayload(jar.get(LOCAL_AUTH_COOKIE)?.value);
  if (!payload || payload.purpose !== "session") return null;
  return {
    userId: payload.sub,
    learnerId: authUserIdToLearnerId(payload.sub),
    email: payload.email,
  };
}

export async function consumeLocalResetToken(token: string): Promise<{
  userId: string;
  email: string;
} | null> {
  const payload = await verifyLocalAuthPayload(token);
  if (!payload || payload.purpose !== "reset") return null;
  return { userId: payload.sub, email: payload.email };
}
