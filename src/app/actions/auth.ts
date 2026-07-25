"use server";

import { redirect } from "next/navigation";
import {
  signInWithPasswordAction,
  signUpWithPasswordAction,
} from "@/server/actions/auth";

export type AuthFormState = {
  error?: string;
  message?: string;
} | null;

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

  const result = await signUpWithPasswordAction({ email, password });
  if (!result.ok) {
    return { error: result.error };
  }

  if (result.needsEmailConfirm) {
    return {
      message:
        result.message ??
        "Účet je vytvořený. Potvrď e-mail odkazem ve schránce a pak se přihlas.",
    };
  }

  redirect("/prehled");
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

  const result = await signInWithPasswordAction({ email, password });
  if (!result.ok) {
    return { error: result.error };
  }

  redirect("/prehled");
}
