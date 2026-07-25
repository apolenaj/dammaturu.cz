"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/app/actions/auth";
import { signInAction, signUpAction } from "@/app/actions/auth";

const inputClassName =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b0d16] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/30";

const buttonClassName =
  "mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-[0_0_28px_-6px_rgba(99,102,241,0.7)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 disabled:cursor-not-allowed disabled:opacity-60";

function AuthAlert({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  if (error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
      >
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p
        role="status"
        className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
      >
        {message}
      </p>
    );
  }
  return null;
}

export function GlassLoginForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signInAction,
    null,
  );

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <AuthAlert error={state?.error} message={state?.message} />

      <label className="block text-sm font-medium text-slate-300">
        E-mail
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="tvuj@email.cz"
          className={inputClassName}
        />
      </label>

      <label className="block text-sm font-medium text-slate-300">
        Heslo
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className={inputClassName}
        />
      </label>

      <button type="submit" disabled={pending} className={buttonClassName}>
        {pending ? "Přihlašuji…" : "Přihlásit se"}
      </button>

      <p className="pt-2 text-center text-sm text-slate-400">
        Nemáš účet?{" "}
        <Link
          href="/register"
          className="font-semibold text-violet-300 underline-offset-2 hover:text-violet-200 hover:underline"
        >
          Zaregistruj se
        </Link>
      </p>
    </form>
  );
}

export function GlassRegisterForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signUpAction,
    null,
  );

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <AuthAlert error={state?.error} message={state?.message} />

      <label className="block text-sm font-medium text-slate-300">
        E-mail
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="tvuj@email.cz"
          className={inputClassName}
        />
      </label>

      <label className="block text-sm font-medium text-slate-300">
        Heslo
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Alespoň 8 znaků"
          className={inputClassName}
        />
      </label>

      <label className="block text-sm font-medium text-slate-300">
        Potvrzení hesla
        <input
          type="password"
          name="passwordConfirm"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Zadej heslo znovu"
          className={inputClassName}
        />
      </label>

      <button type="submit" disabled={pending} className={buttonClassName}>
        {pending ? "Vytvářím účet…" : "Zaregistrovat se"}
      </button>

      <p className="pt-2 text-center text-sm text-slate-400">
        Už máš účet?{" "}
        <Link
          href="/login"
          className="font-semibold text-violet-300 underline-offset-2 hover:text-violet-200 hover:underline"
        >
          Přihlas se
        </Link>
      </p>
    </form>
  );
}
