"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  requestPasswordResetAction,
  signInWithMagicLinkAction,
  signInWithPasswordAction,
} from "@/server/actions/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Caps = {
  configured: boolean;
  magicLink: boolean;
  google: boolean;
};

type Mode = "password" | "magic" | "reset";

export function LoginForm({
  caps,
  nextPath = "/app/dashboard",
  initialReason,
}: {
  caps: Caps;
  nextPath?: string;
  initialReason?: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(reasonMessage(initialReason));
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [googlePending, setGooglePending] = useState(false);

  if (!caps.configured) {
    return (
      <p className="mt-6 rounded-md border border-border bg-subtle px-4 py-3 text-body-sm text-fg-secondary">
        Přihlášení teď není dostupné. Zkus to prosím později.
      </p>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    start(async () => {
      if (mode === "password") {
        const res = await signInWithPasswordAction({ email, password });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.replace(nextPath);
        router.refresh();
        return;
      }
      if (mode === "magic") {
        const res = await signInWithMagicLinkAction({ email });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setInfo(res.message ?? "Podívej se do e-mailu.");
        return;
      }
      const res = await requestPasswordResetAction({ email });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInfo(
        `${res.message ?? "Podívej se do e-mailu."} Pak otevři stránku nového hesla.`,
      );
    });
  }

  async function onGoogle() {
    setError(null);
    setGooglePending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (oauthError) {
        setError("Přihlášení Googlem se nepovedlo. Zkus to prosím znovu.");
        setGooglePending(false);
      }
    } catch {
      setError("Přihlášení Googlem se nepovedlo. Zkus to prosím znovu.");
      setGooglePending(false);
    }
  }

  return (
    <div className="mt-8 space-y-5">
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-soft/30 px-4 py-3 text-body-sm text-fg"
        >
          {error}
        </p>
      ) : null}
      {info ? (
        <p
          role="status"
          className="rounded-md border border-success/30 bg-success-soft/30 px-4 py-3 text-body-sm text-fg"
        >
          {info}
          {mode === "reset" ? (
            <>
              {" "}
              <Link href="/auth/nove-heslo" className="font-semibold text-action underline">
                Nové heslo
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <div
        className="flex flex-wrap gap-2 text-body-sm"
        role="tablist"
        aria-label="Způsob přihlášení"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "password"}
          className={tabClass(mode === "password")}
          onClick={() => setMode("password")}
        >
          E-mail a heslo
        </button>
        {caps.magicLink ? (
          <button
            type="button"
            role="tab"
            aria-selected={mode === "magic"}
            className={tabClass(mode === "magic")}
            onClick={() => setMode("magic")}
          >
            Odkaz e-mailem
          </button>
        ) : null}
        <button
          type="button"
          role="tab"
          aria-selected={mode === "reset"}
          className={tabClass(mode === "reset")}
          onClick={() => setMode("reset")}
        >
          Zapomenuté heslo
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="E-mail">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>

        {mode === "password" ? (
          <Field label="Heslo">
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
        ) : null}

        <Button type="submit" fullWidth size="lg" className="min-h-12" disabled={pending}>
          {pending
            ? "Počkej…"
            : mode === "password"
              ? "Přihlásit se"
              : mode === "magic"
                ? "Poslat odkaz"
                : "Obnovit heslo"}
        </Button>
      </form>

      {caps.google ? (
        <>
          <div className="relative py-1 text-center text-caption text-fg-muted">
            <span className="relative z-10 bg-paper-wash px-2">nebo</span>
            <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            fullWidth
            disabled={googlePending}
            onClick={() => void onGoogle()}
          >
            {googlePending ? "Přesměrovávám…" : "Pokračovat s Googlem"}
          </Button>
        </>
      ) : null}

      <p className="text-center text-caption text-fg-muted">
        Nemáš účet?{" "}
        <Link href="/registrace" className="font-semibold text-action">
          Registrace
        </Link>
      </p>
    </div>
  );
}

function tabClass(active: boolean) {
  return [
    "min-h-11 touch-manipulation rounded-md px-3 py-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2",
    active
      ? "bg-action text-fg-on-brand"
      : "bg-subtle text-fg-secondary hover:text-fg",
  ].join(" ");
}

function reasonMessage(reason: string | null | undefined): string | null {
  switch (reason) {
    case "session":
      return "Pro pokračování se přihlas. Session vypršela nebo chybí.";
    case "expired":
      return "Odkaz nebo session vypršela. Přihlas se znovu nebo požádej o nový odkaz.";
    case "unavailable":
      return "Přihlášení teď není dostupné. Zkus to prosím později.";
    default:
      return null;
  }
}
