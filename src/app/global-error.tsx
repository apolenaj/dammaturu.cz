"use client";

import { AppErrorState } from "@/components/shell/app-screen";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log digest only — never render raw message to students
  if (typeof console !== "undefined") {
    console.error("[global error]", error.digest ?? "unknown");
  }

  return (
    <html lang="cs">
      <body className="bg-canvas p-6 text-fg">
        <AppErrorState
          title="Aplikace se zasekla"
          description="Zkus to znovu. Když problém zůstane, otevři materiály a pokračuj v učení bez této stránky."
          onRetry={reset}
        />
      </body>
    </html>
  );
}
