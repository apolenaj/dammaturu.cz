"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  isGoogleAuthEnabled,
  isMagicLinkEnabled,
  isSupabaseConfigured,
  siteUrl,
} from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  clearLocalAuthCookie,
  isLocalDevAuthEnabled,
  localRequestPasswordReset,
  localSignIn,
  localSignUp,
  localUpdatePasswordWithSession,
  setLocalAuthCookie,
} from "@/server/auth/local-dev-auth";
import { getAuthIdentity } from "@/server/learner-session";
import { getLearner } from "@/server/learner-store";
import { recordProductEvent } from "@/server/product-analytics/store";
import {
  clientIpFromHeaders,
  rateLimit,
} from "@/server/security/rate-limit";

const emailSchema = z
  .string()
  .trim()
  .email("Zadej platný e-mail.")
  .max(254);

const passwordSchema = z
  .string()
  .min(8, "Heslo musí mít alespoň 8 znaků.")
  .max(128, "Heslo je příliš dlouhé.");

export type AuthActionResult =
  | { ok: true; message?: string; needsEmailConfirm?: boolean }
  | { ok: false; error: string; code?: string };

function mapAuthError(message: string | undefined): {
  error: string;
  code?: string;
} {
  const raw = (message ?? "").toLowerCase();

  if (raw.includes("invalid login credentials") || raw.includes("invalid_credentials")) {
    return { error: "Neplatný e-mail nebo heslo.", code: "invalid_credentials" };
  }
  if (raw.includes("email not confirmed")) {
    return {
      error: "Nejdřív potvrď e-mail — podívej se do schránky.",
      code: "email_not_confirmed",
    };
  }
  if (
    raw.includes("user already registered") ||
    raw.includes("already been registered") ||
    raw.includes("already registered")
  ) {
    return {
      error: "Účet s tímto e-mailem už existuje. Přihlas se nebo obnov heslo.",
      code: "existing_account",
    };
  }
  if (raw.includes("password")) {
    return { error: "Heslo nesplňuje požadavky. Zkus jiné.", code: "weak_password" };
  }
  if (raw.includes("rate") || raw.includes("too many")) {
    return {
      error: "Příliš mnoho pokusů. Chvíli počkej a zkus to znovu.",
      code: "rate_limit",
    };
  }
  if (raw.includes("expired") || raw.includes("otp")) {
    return {
      error: "Odkaz vypršel. Požádej o nový.",
      code: "expired",
    };
  }

  return {
    error: "Akce se nepovedla. Zkus to prosím znovu.",
    code: "unknown",
  };
}

function authAvailable(): boolean {
  return isSupabaseConfigured() || isLocalDevAuthEnabled();
}

function ensureAuthAvailable(): AuthActionResult | null {
  if (!authAvailable()) {
    console.error("[auth] ensureAuthAvailable: Auth není dostupná", {
      supabaseConfigured: isSupabaseConfigured(),
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
      nodeEnv: process.env.NODE_ENV,
    });
    return {
      ok: false,
      error:
        "Supabase Auth není nakonfigurována. Zkontroluj NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY v .env.local a restartuj dev server.",
      code: "not_configured",
    };
  }
  return null;
}

async function enforceAuthRateLimit(
  action: "signup" | "signin" | "reset",
): Promise<AuthActionResult | null> {
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  const limited = rateLimit({
    key: `auth:${action}:${ip}`,
    limit: action === "signin" ? 30 : 15,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return {
      ok: false,
      error: "Příliš mnoho pokusů. Chvíli počkej a zkus to znovu.",
      code: "rate_limit",
    };
  }
  return null;
}

export async function signUpWithPasswordAction(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const blocked = ensureAuthAvailable();
  if (blocked) return blocked;
  const limited = await enforceAuthRateLimit("signup");
  if (limited) return limited;

  const email = emailSchema.safeParse(input.email);
  const password = passwordSchema.safeParse(input.password);
  if (!email.success) {
    return { ok: false, error: email.error.issues[0]?.message ?? "Neplatný e-mail." };
  }
  if (!password.success) {
    return {
      ok: false,
      error: password.error.issues[0]?.message ?? "Neplatné heslo.",
    };
  }

  if (!isSupabaseConfigured() && isLocalDevAuthEnabled()) {
    const res = await localSignUp(email.data, password.data);
    if (!res.ok) return { ok: false, error: res.error, code: res.code };
    await setLocalAuthCookie(res.userId, res.email);
    await recordProductEvent({
      learnerKey: res.userId,
      event: "registration_completed",
    });
    revalidatePath("/", "layout");
    return { ok: true };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.data,
      password: password.data,
      options: {
        emailRedirectTo: `${siteUrl()}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      console.error("[auth] supabase.auth.signUp error:", {
        message: error.message,
        status: error.status,
        name: error.name,
        code: (error as { code?: string }).code,
        full: error,
      });
      // Při vývoji vrať přesnou zprávu ze Supabase (ne obecný mapovaný text).
      return {
        ok: false,
        error: error.message,
        code: (error as { code?: string }).code ?? mapAuthError(error.message).code,
      };
    }

    if (
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      return {
        ok: false,
        error: "Účet s tímto e-mailem už existuje. Přihlas se nebo obnov heslo.",
        code: "existing_account",
      };
    }

    if (data.user?.id) {
      await recordProductEvent({
        learnerKey: data.user.id,
        event: "registration_completed",
      });
    }

    const needsEmailConfirm = !data.session;
    revalidatePath("/", "layout");

    if (needsEmailConfirm) {
      return {
        ok: true,
        needsEmailConfirm: true,
        message:
          "Účet je vytvořený. Potvrď e-mail odkazem ve schránce a pak se přihlas.",
      };
    }

    return { ok: true };
  } catch (error) {
    console.error("[auth] signUp failed", error);
    return {
      ok: false,
      error: "Registrace se nepovedla. Zkus to prosím znovu.",
    };
  }
}

export async function signInWithPasswordAction(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const blocked = ensureAuthAvailable();
  if (blocked) return blocked;
  const limited = await enforceAuthRateLimit("signin");
  if (limited) return limited;

  const email = emailSchema.safeParse(input.email);
  const password = passwordSchema.safeParse(input.password);
  if (!email.success) {
    return { ok: false, error: email.error.issues[0]?.message ?? "Neplatný e-mail." };
  }
  if (!password.success) {
    return { ok: false, error: "Zadej heslo." };
  }

  if (!isSupabaseConfigured() && isLocalDevAuthEnabled()) {
    const res = await localSignIn(email.data, password.data);
    if (!res.ok) return { ok: false, error: res.error, code: res.code };
    await setLocalAuthCookie(res.userId, res.email);
    revalidatePath("/", "layout");
    return { ok: true };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.data,
      password: password.data,
    });

    if (error) {
      console.error("[auth] supabase.auth.signInWithPassword error:", {
        message: error.message,
        status: error.status,
        name: error.name,
        code: (error as { code?: string }).code,
        full: error,
      });
      return {
        ok: false,
        error: error.message,
        code: (error as { code?: string }).code ?? mapAuthError(error.message).code,
      };
    }

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error("[auth] signIn failed", error);
    return {
      ok: false,
      error: "Přihlášení se nepovedlo. Zkus to prosím znovu.",
    };
  }
}

export async function signInWithMagicLinkAction(input: {
  email: string;
}): Promise<AuthActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Přihlášení odkazem vyžaduje produkční Auth. Použij e-mail a heslo.",
      code: "disabled",
    };
  }
  if (!isMagicLinkEnabled()) {
    return { ok: false, error: "Přihlášení odkazem není zapnuté.", code: "disabled" };
  }

  const email = emailSchema.safeParse(input.email);
  if (!email.success) {
    return { ok: false, error: email.error.issues[0]?.message ?? "Neplatný e-mail." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.data,
      options: {
        emailRedirectTo: `${siteUrl()}/auth/callback?next=/app/dashboard`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      const mapped = mapAuthError(error.message);
      return { ok: false, ...mapped };
    }

    return {
      ok: true,
      message: "Poslali jsme ti přihlašovací odkaz na e-mail.",
    };
  } catch (error) {
    console.error("[auth] magic link failed", error);
    return {
      ok: false,
      error: "Odkaz se nepodařilo odeslat. Zkus to prosím znovu.",
    };
  }
}

export async function requestPasswordResetAction(input: {
  email: string;
}): Promise<AuthActionResult> {
  const blocked = ensureAuthAvailable();
  if (blocked) return blocked;

  const email = emailSchema.safeParse(input.email);
  if (!email.success) {
    return { ok: false, error: email.error.issues[0]?.message ?? "Neplatný e-mail." };
  }

  if (!isSupabaseConfigured() && isLocalDevAuthEnabled()) {
    const res = await localRequestPasswordReset(email.data);
    // Local: if account exists, establish reset session cookie via sign-in path —
    // set a temporary session so /auth/nove-heslo works (same as recovery link).
    if (res.resetToken) {
      const { consumeLocalResetToken, setLocalAuthCookie } = await import(
        "@/server/auth/local-dev-auth"
      );
      const consumed = await consumeLocalResetToken(res.resetToken);
      if (consumed) {
        await setLocalAuthCookie(consumed.userId, consumed.email);
      }
    }
    revalidatePath("/", "layout");
    return {
      ok: true,
      message:
        "Pokud účet existuje, otevři stránku pro nové heslo a nastav ho.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${siteUrl()}/auth/callback?next=/auth/nove-heslo`,
    });

    if (error) {
      const mapped = mapAuthError(error.message);
      return { ok: false, ...mapped };
    }

    return {
      ok: true,
      message:
        "Pokud účet existuje, pošleme odkaz na obnovení hesla na e-mail.",
    };
  } catch (error) {
    console.error("[auth] password reset request failed", error);
    return {
      ok: false,
      error: "Obnovení hesla se nepovedlo. Zkus to prosím znovu.",
    };
  }
}

export async function updatePasswordAction(input: {
  password: string;
}): Promise<AuthActionResult> {
  const blocked = ensureAuthAvailable();
  if (blocked) return blocked;

  const password = passwordSchema.safeParse(input.password);
  if (!password.success) {
    return {
      ok: false,
      error: password.error.issues[0]?.message ?? "Neplatné heslo.",
    };
  }

  try {
    const identity = await getAuthIdentity();
    if (!identity) {
      return {
        ok: false,
        error: "Session vypršela. Požádej o nový odkaz na obnovení hesla.",
        code: "expired_session",
      };
    }

    if (identity.provider === "local-dev") {
      const res = await localUpdatePasswordWithSession(
        identity.userId,
        password.data,
      );
      if (!res.ok) return { ok: false, error: res.error, code: "expired_session" };
      revalidatePath("/", "layout");
      return { ok: true, message: "Heslo je změněné. Můžeš pokračovat." };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      password: password.data,
    });

    if (error) {
      const mapped = mapAuthError(error.message);
      return { ok: false, ...mapped };
    }

    revalidatePath("/", "layout");
    return { ok: true, message: "Heslo je změněné. Můžeš pokračovat." };
  } catch (error) {
    console.error("[auth] update password failed", error);
    return {
      ok: false,
      error: "Změna hesla se nepovedla. Zkus to prosím znovu.",
    };
  }
}

export async function signInWithGoogleAction(): Promise<AuthActionResult> {
  if (!isSupabaseConfigured() || !isGoogleAuthEnabled()) {
    return { ok: false, error: "Přihlášení Googlem není zapnuté.", code: "disabled" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl()}/auth/callback?next=/app/dashboard`,
      },
    });

    if (error) {
      const mapped = mapAuthError(error.message);
      return { ok: false, ...mapped };
    }

    if (data.url) {
      redirect(data.url);
    }

    return { ok: false, error: "Nepodařilo se spustit Google přihlášení." };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("[auth] google oauth failed", error);
    return {
      ok: false,
      error: "Přihlášení Googlem se nepovedlo. Zkus to prosím znovu.",
    };
  }
}

export async function logoutLearnerAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[auth] signOut failed", error);
    }
  }
  if (isLocalDevAuthEnabled()) {
    await clearLocalAuthCookie();
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function getSessionResumeAction(): Promise<{
  hasSession: boolean;
  displayName: string | null;
  email: string | null;
  hasOnboarding: boolean;
  authConfigured: boolean;
}> {
  if (!authAvailable()) {
    return {
      hasSession: false,
      displayName: null,
      email: null,
      hasOnboarding: false,
      authConfigured: false,
    };
  }

  const identity = await getAuthIdentity();
  if (!identity) {
    return {
      hasSession: false,
      displayName: null,
      email: null,
      hasOnboarding: false,
      authConfigured: true,
    };
  }

  const learner = await getLearner(identity.learnerId);
  return {
    hasSession: true,
    displayName: learner?.profile.displayName ?? null,
    email: identity.email,
    hasOnboarding: Boolean(learner),
    authConfigured: true,
  };
}

export async function getAuthCapabilitiesAction(): Promise<{
  configured: boolean;
  magicLink: boolean;
  google: boolean;
  provider: "supabase" | "local-dev" | "none";
}> {
  if (isSupabaseConfigured()) {
    return {
      configured: true,
      magicLink: isMagicLinkEnabled(),
      google: isGoogleAuthEnabled(),
      provider: "supabase",
    };
  }
  if (isLocalDevAuthEnabled()) {
    return {
      configured: true,
      magicLink: false,
      google: false,
      provider: "local-dev",
    };
  }
  return {
    configured: false,
    magicLink: false,
    google: false,
    provider: "none",
  };
}
