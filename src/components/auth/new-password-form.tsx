"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updatePasswordAction } from "@/server/actions/auth";

export function NewPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== password2) {
      setError("Hesla se neshodují.");
      return;
    }
    start(async () => {
      const res = await updatePasswordAction({ password });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace("/app/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-soft/30 px-4 py-3 text-body-sm text-fg"
        >
          {error}
        </p>
      ) : null}
      <label className="block space-y-1.5">
        <span className="text-caption font-medium text-fg-muted">Nové heslo</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-body-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-caption font-medium text-fg-muted">
          Nové heslo znovu
        </span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-body-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        />
      </label>
      <Button type="submit" fullWidth size="lg" disabled={pending}>
        {pending ? "Ukládám…" : "Uložit heslo"}
      </Button>
    </form>
  );
}
