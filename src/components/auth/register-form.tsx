"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpWithPasswordAction } from "@/server/actions/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Caps = {
  configured: boolean;
  magicLink: boolean;
  google: boolean;
};

export function RegisterForm({
  caps,
  nextPath = "/onboarding",
}: {
  caps: Caps;
  nextPath?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [googlePending, setGooglePending] = useState(false);

  if (!caps.configured) {
    return (
      <p className="mt-6 rounded-md border border-border bg-subtle px-4 py-3 text-body-sm text-fg-secondary">
        Registrace teď není dostupná. Zkus to prosím později.
      </p>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password !== password2) {
      setError("Hesla se neshodují.");
      return;
    }
    start(async () => {
      const res = await signUpWithPasswordAction({ email, password });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.needsEmailConfirm) {
        setInfo(res.message ?? "Potvrď e-mail a pak se přihlas.");
        return;
      }
      router.replace(nextPath);
      router.refresh();
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
        setError("Registrace přes Google se nepovedla. Zkus to prosím znovu.");
        setGooglePending(false);
      }
    } catch {
      setError("Registrace přes Google se nepovedla. Zkus to prosím znovu.");
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
          {error.includes("už existuje") ? (
            <>
              {" "}
              <Link href="/prihlaseni" className="font-semibold text-action underline">
                Přihlásit se
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      {info ? (
        <p
          role="status"
          className="rounded-md border border-success/30 bg-success-soft/30 px-4 py-3 text-body-sm text-fg"
        >
          {info}{" "}
          <Link href="/prihlaseni" className="font-semibold text-action underline">
            Přihlášení
          </Link>
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-fg-muted">E-mail</span>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-fg-muted">Heslo</span>
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="text-caption text-fg-muted">Minimálně 8 znaků.</span>
        </label>
        <label className="block space-y-1.5">
          <span className="text-caption font-medium text-fg-muted">
            Heslo znovu
          </span>
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </label>
        <Button type="submit" fullWidth size="lg" className="min-h-12" disabled={pending}>
          {pending ? "Vytvářím účet…" : "Vytvořit účet"}
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
        Už máš účet?{" "}
        <Link href="/prihlaseni" className="font-semibold text-action">
          Přihlásit se
        </Link>
      </p>
    </div>
  );
}
