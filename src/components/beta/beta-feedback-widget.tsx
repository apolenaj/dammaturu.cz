"use client";

import { useState, useTransition } from "react";
import {
  betaFeedbackPromptCs,
} from "@/domain/learning/beta-feedback";
import { submitBetaFeedbackAction } from "@/server/actions/beta-feedback";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function BetaFeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    confusingCs: "",
    boringCs: "",
    helpedMostCs: "",
    brokenCs: "",
    changeWishCs: "",
  });

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
    <div className="fixed bottom-20 right-3 z-40 max-w-[min(100vw-1.5rem,22rem)] lg:bottom-6">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setSent(false);
          }}
          className="rounded-full border border-border bg-canvas px-4 py-2.5 text-body-sm font-semibold text-fg shadow-md hover:bg-subtle"
        >
          Feedback
        </button>
      ) : (
        <div
          className={cn(
            "rounded-2xl border border-border bg-canvas p-4 shadow-lg",
          )}
          role="dialog"
          aria-label={betaFeedbackPromptCs.titleCs}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-lg text-fg">
                {betaFeedbackPromptCs.titleCs}
              </p>
              <p className="text-caption text-fg-muted">
                {betaFeedbackPromptCs.subtitleCs}
              </p>
            </div>
            <button
              type="button"
              className="text-caption font-semibold text-fg-muted hover:text-fg"
              onClick={() => setOpen(false)}
            >
              Zavřít
            </button>
          </div>
          {sent ? (
            <p className="mt-3 text-body-sm text-success">
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
                  <span className="text-caption font-semibold text-fg-muted">
                    {label}
                  </span>
                  <textarea
                    rows={2}
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-body-sm text-fg"
                  />
                </label>
              ))}
              {error ? (
                <p className="text-caption text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" fullWidth disabled={pending} size="sm">
                {betaFeedbackPromptCs.submitCs}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
