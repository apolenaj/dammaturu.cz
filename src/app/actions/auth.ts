"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getSupabaseConfigDiagnostics,
  isSupabaseConfigured,
  siteUrl,
} from "@/lib/supabase/env";

export type AuthFormState = {
  error?: string;
  message?: string;
} | null;

function notConfiguredError(): AuthFormState {
  const diag = getSupabaseConfigDiagnostics();
  console.error("[auth] Supabase Auth není dostupná", diag);
  return {
    error:
      "Supabase Auth není nakonfigurována. Zkontroluj NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY v .env.local a restartuj `npm run dev`. " +
      `(url=${diag.hasUrl ? "ok" : "chybí"}, anonKey=${diag.hasAnonKey ? "ok" : "chybí"}, host=${diag.urlHost ?? "—"})`,
  };
}

/**
 * Registrace e-mailem a heslem (FormData).
 * Při úspěchu přesměruje na /prehled.
 */
export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!email) {
    return { error: "Zadej e-mail." };
  }
  if (!password) {
    return { error: "Zadej heslo." };
  }
  if (password.length < 8) {
    return { error: "Heslo musí mít alespoň 8 znaků." };
  }
  if (passwordConfirm && password !== passwordConfirm) {
    return { error: "Hesla se neshodují." };
  }

  if (!isSupabaseConfigured()) {
    return notConfiguredError();
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl()}/auth/callback?next=/prehled`,
      },
    });

    if (error) {
      console.error("[auth] supabase.auth.signUp error:", {
        message: error.message,
        status: error.status,
        name: error.name,
        code: (error as { code?: string }).code,
        cause: (error as { cause?: unknown }).cause,
        full: error,
      });
      return { error: error.message };
    }

    console.info("[auth] supabase.auth.signUp ok:", {
      userId: data.user?.id ?? null,
      hasSession: Boolean(data.session),
      identities: data.user?.identities?.length ?? 0,
    });

    if (
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      return {
        error: "Účet s tímto e-mailem už existuje. Přihlas se nebo obnov heslo.",
      };
    }

    revalidatePath("/", "layout");

    if (!data.session) {
      return {
        message:
          "Účet je vytvořený. Potvrď e-mail odkazem ve schránce a pak se přihlas.",
      };
    }

    redirect("/prehled");
  } catch (error) {
    // redirect() throws NEXT_REDIRECT — must rethrow
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("[auth] signUpAction failed (exception):", error);
    const message =
      error instanceof Error
        ? error.message
        : "Registrace se nepovedla. Zkus to prosím znovu.";
    return { error: message };
  }
}

/**
 * Přihlášení e-mailem a heslem (FormData).
 * Při úspěchu přesměruje na /prehled.
 */
export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    return { error: "Zadej e-mail." };
  }
  if (!password) {
    return { error: "Zadej heslo." };
  }

  if (!isSupabaseConfigured()) {
    return notConfiguredError();
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[auth] supabase.auth.signInWithPassword error:", {
        message: error.message,
        status: error.status,
        name: error.name,
        code: (error as { code?: string }).code,
        cause: (error as { cause?: unknown }).cause,
        full: error,
      });
      return { error: error.message };
    }

    console.info("[auth] supabase.auth.signInWithPassword ok:", {
      userId: data.user?.id ?? null,
      hasSession: Boolean(data.session),
    });

    revalidatePath("/", "layout");
    redirect("/prehled");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("[auth] signInAction failed (exception):", error);
    const message =
      error instanceof Error
        ? error.message
        : "Přihlášení se nepovedlo. Zkus to prosím znovu.";
    return { error: message };
  }
}
