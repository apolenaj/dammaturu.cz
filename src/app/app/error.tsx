"use client";

import { useEffect } from "react";
import { AppErrorState } from "@/components/shell/app-screen";

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
    <AppErrorState
      onRetry={reset}
      description="Zkus to znovu. Když problém zůstane, vrať se na Dnes a pokračuj od mise."
    />
  );
}
