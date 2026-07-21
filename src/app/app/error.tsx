"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error.message);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-1 py-8">
      <Alert title="Něco se pokazilo" tone="danger">
        Zkus to znovu. Pokud problém přetrvá, vrať se na Dnes.
      </Alert>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={reset}>
          Zkusit znovu
        </Button>
        <Link
          href="/app/dashboard"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-body-sm font-semibold text-fg"
        >
          Zpět na Dnes
        </Link>
      </div>
    </div>
  );
}
