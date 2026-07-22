"use client";

import { useEffect } from "react";
import { AppErrorState } from "@/components/shell/app-screen";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root error]", error.digest ?? "unknown");
  }, [error]);

  return (
    <main id="main-content" className="mx-auto max-w-lg px-4 py-16">
      <AppErrorState onRetry={reset} />
    </main>
  );
}
