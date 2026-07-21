"use client";

import { useTransition } from "react";
import { logoutLearnerAction } from "@/server/actions/learner-session";

export function LogoutButton() {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => logoutLearnerAction())}
      className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-body-sm font-semibold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
    >
      {pending ? "Odhlašuji…" : "Odhlásit se"}
    </button>
  );
}
