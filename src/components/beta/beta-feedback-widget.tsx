"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { betaFeedbackPromptCs } from "@/domain/learning/beta-feedback";
import { submitBetaFeedbackAction } from "@/server/actions/beta-feedback";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Paths where a floating FAB would cover answer/next controls. */
const HIDE_FAB_PREFIXES = [
  "/app/learn",
  "/app/review",
  "/app/tests",
  "/app/mistakes",
  "/app/materials/",
  "/app/cermat",
  "/app/oral",
  "/app/simulation",
];

export function BetaFeedbackWidget() {
  const pathname = usePathname() ?? "";
  const hideFab = HIDE_FAB_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p),
  );
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [form, setForm] = useState({
    confusingCs: "",
    boringCs: "",
    helpedMostCs: "",
    brokenCs: "",
    changeWishCs: "",
  });

  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (hideFab) return null;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitBetaFeedbackAction(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSent(true);
      setForm({
        confusingCs: "",
        boringCs: "",
        helpedMostCs: "",
        brokenCs: "",
        changeWishCs: "",
      });
    });
  }

  return (
    <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 z-20 max-w-[min(100vw-1.5rem,20rem)] lg:bottom-6 lg:left-auto lg:right-6">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setSent(false);
          }}
          className="min-h-11 touch-manipulation rounded-full border border-border bg-canvas px-4 py-2.5 text-body-sm font-semibold text-fg shadow-md transition hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          Feedback
        </button>
      ) : (
        <div
          ref={dialogRef}
          className={cn(
            "rounded-2xl border border-border bg-canvas p-4 shadow-lg",
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p id={titleId} className="font-display text-lg text-fg">
                {betaFeedbackPromptCs.titleCs}
              </p>
              <p className="text-caption text-fg-muted">
                {betaFeedbackPromptCs.subtitleCs}
              </p>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              className="touch-target min-h-11 min-w-11 rounded-md text-caption font-semibold text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              onClick={() => setOpen(false)}
            >
              Zavřít
            </button>
          </div>
          {sent ? (
            <p className="mt-3 text-body-sm text-success" role="status">
              {betaFeedbackPromptCs.thanksCs}
            </p>
          ) : (
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              {(
                [
                  ["confusingCs", betaFeedbackPromptCs.confusingCs],
                  ["boringCs", betaFeedbackPromptCs.boringCs],
                  ["helpedMostCs", betaFeedbackPromptCs.helpedMostCs],
                  ["brokenCs", betaFeedbackPromptCs.brokenCs],
                  ["changeWishCs", betaFeedbackPromptCs.changeWishCs],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block space-y-1">
                  <span className="text-caption font-semibold text-fg-secondary">
                    {label}
                  </span>
                  <textarea
                    rows={2}
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    className="w-full rounded-md border border-border bg-surface px-2 py-2 text-base text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  />
                </label>
              ))}
              {error ? (
                <p className="text-caption text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" fullWidth disabled={pending} size="md">
                {betaFeedbackPromptCs.submitCs}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
