"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  cermatCategoryLabelsCs,
  type CermatCategory,
  type CermatHubView,
  type CermatItem,
  type CermatSessionMode,
} from "@/domain/learning/cermat-prep";
import {
  startCermatSessionAction,
  submitCermatAnswerAction,
} from "@/server/actions/cermat-prep";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CermatPrepHub({ initialView }: { initialView: CermatHubView }) {
  const [view, setView] = useState(initialView);
  const [phase, setPhase] = useState<"hub" | "session" | "summary">("hub");
  const [mode, setMode] = useState<CermatSessionMode>("untimed_training");
  const [categoryFilter, setCategoryFilter] = useState<CermatCategory | "">("");
  const [items, setItems] = useState<CermatItem[]>([]);
  const [index, setIndex] = useState(0);
  const [timedLeft, setTimedLeft] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    result: string;
    explanationCs: string;
    provenanceLabelCs: string;
  } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (timedLeft == null || timedLeft <= 0 || phase !== "session") return;
    const t = setTimeout(() => setTimedLeft((s) => (s == null ? s : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [timedLeft, phase]);

  useEffect(() => {
    if (timedLeft === 0 && phase === "session") {
      setPhase("summary");
    }
  }, [timedLeft, phase]);

  const current = items[index] ?? null;

  function start() {
    setError(null);
    startTransition(async () => {
      const res = await startCermatSessionAction({
        mode,
        categoryFilter:
          mode === "untimed_training" && categoryFilter
            ? categoryFilter
            : null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setItems(res.items);
      setIndex(0);
      setCorrectCount(0);
      setFeedback(null);
      setAnswer("");
      setSelected(null);
      setTimedLeft(res.timedSeconds);
      setPhase("session");
    });
  }

  function submit() {
    if (!current) return;
    const payload =
      current.format === "fill_blank"
        ? answer
        : selected ?? answer;
    if (!payload || (typeof payload === "string" && !payload.trim())) {
      setError("Vyber nebo napiš odpověď.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitCermatAnswerAction({
        itemId: current.id,
        answer: payload,
        mode,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.result === "correct") setCorrectCount((c) => c + 1);
      setFeedback({
        result: res.result,
        explanationCs: res.explanationCs,
        provenanceLabelCs: res.provenanceLabelCs,
      });
      setView((v) => ({
        ...v,
        categories: res.progress.byCategory.map((row) => ({
          category: row.category,
          labelCs: cermatCategoryLabelsCs[row.category],
          hintCs:
            v.categories.find((c) => c.category === row.category)?.hintCs ??
            "",
          accuracyPct: row.accuracyPct,
          attempts: row.attempts,
        })),
        weakCategories: res.progress.byCategory
          .filter((r) => r.attempts > 0)
          .sort((a, b) => (a.accuracyPct ?? 100) - (b.accuracyPct ?? 100))
          .slice(0, 3)
          .map((r) => r.category),
      }));
    });
  }

  function next() {
    setFeedback(null);
    setAnswer("");
    setSelected(null);
    if (index + 1 >= items.length) {
      setPhase("summary");
      return;
    }
    setIndex((i) => i + 1);
  }

  if (phase === "summary") {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-xl text-fg">Shrnutí session</h2>
        <p className="text-body-md text-fg-secondary">
          Správně {correctCount} z {items.length} v této session.
        </p>
        <Button
          type="button"
          onClick={() => {
            setPhase("hub");
            setItems([]);
          }}
        >
          Zpět na přehled
        </Button>
      </div>
    );
  }

  if (phase === "session" && current) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="brand">
            {index + 1}/{items.length} ·{" "}
            {cermatCategoryLabelsCs[current.category]}
          </Badge>
          {timedLeft != null ? (
            <p className="font-display text-xl tabular-nums text-fg">
              {formatTime(timedLeft)}
            </p>
          ) : (
            <Badge tone="neutral">Bez limitu</Badge>
          )}
        </div>

        <Alert title="Provenience" tone="info">
          {current.provenanceLabelCs}
        </Alert>

        {current.passageCs ? (
          <blockquote className="rounded-xl border border-border bg-subtle/40 px-3 py-3 text-body-sm text-fg-secondary">
            {current.passageCs}
          </blockquote>
        ) : null}

        <p className="font-display text-lg text-fg">{current.stemCs}</p>

        {current.options && current.format !== "fill_blank" ? (
          <ul className="space-y-2">
            {current.options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={Boolean(feedback)}
                  onClick={() => setSelected(o.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left text-body-sm",
                    selected === o.id
                      ? "border-action bg-action/5"
                      : "border-border bg-canvas",
                  )}
                >
                  {o.labelCs}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <input
            value={answer}
            disabled={Boolean(feedback)}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Tvoje odpověď"
            className="min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body-sm"
          />
        )}

        {feedback ? (
          <Alert
            title={
              feedback.result === "correct"
                ? "Správně"
                : feedback.result === "partial"
                  ? "Částečně"
                  : "Špatně"
            }
            tone={
              feedback.result === "correct"
                ? "success"
                : feedback.result === "partial"
                  ? "warning"
                  : "danger"
            }
          >
            <p>{feedback.explanationCs}</p>
            <p className="mt-2 text-caption text-fg-muted">
              {feedback.provenanceLabelCs}
            </p>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {!feedback ? (
            <Button type="button" disabled={pending} onClick={submit}>
              Odeslat
            </Button>
          ) : (
            <Button type="button" onClick={next}>
              {index + 1 >= items.length ? "Shrnutí" : "Další"}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPhase("summary")}
          >
            Ukončit
          </Button>
        </div>
        {error ? (
          <Alert title="Chyba" tone="danger">
            {error}
          </Alert>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Badge tone="brand">CERMAT ČJL</Badge>
        <h1 className="font-display text-display-md text-fg">{view.titleCs}</h1>
        <p className="text-body-md text-fg-secondary">{view.summaryCs}</p>
        <Alert title="Důležité" tone="warning">
          {view.disclaimerCs}
        </Alert>
        <p className="text-caption text-fg-muted">{view.generatedOnlyNoticeCs}</p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Výkon podle kategorií</h2>
        <ul className="space-y-2">
          {view.categories.map((c) => (
            <li
              key={c.category}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-canvas px-3 py-2"
            >
              <div>
                <p className="text-body-sm font-semibold text-fg">{c.labelCs}</p>
                <p className="text-caption text-fg-muted">{c.hintCs}</p>
              </div>
              <Badge
                tone={
                  c.accuracyPct == null
                    ? "neutral"
                    : c.accuracyPct < 50
                      ? "danger"
                      : c.accuracyPct < 70
                        ? "warning"
                        : "success"
                }
              >
                {c.accuracyPct == null ? "—" : `${c.accuracyPct} %`} · {c.attempts}×
              </Badge>
            </li>
          ))}
        </ul>
        {view.weakCategories.length > 0 ? (
          <p className="text-caption text-fg-secondary">
            Relativně slabší:{" "}
            {view.weakCategories
              .map((c) => cermatCategoryLabelsCs[c])
              .join(" · ")}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Režim</h2>
        <ul className="space-y-2">
          {view.modes.map((m) => (
            <li key={m.mode}>
              <button
                type="button"
                onClick={() => setMode(m.mode)}
                className={cn(
                  "w-full rounded-xl border px-3 py-3 text-left",
                  mode === m.mode
                    ? "border-action bg-action/5"
                    : "border-border bg-canvas",
                )}
              >
                <p className="font-semibold text-fg">{m.labelCs}</p>
                <p className="text-caption text-fg-secondary">{m.hintCs}</p>
              </button>
            </li>
          ))}
        </ul>

        {mode === "untimed_training" ? (
          <label className="block space-y-1">
            <span className="text-caption font-semibold text-fg-muted">
              Filtr kategorie (volitelné)
            </span>
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as CermatCategory | "")
              }
              className="min-h-11 w-full rounded-md border border-border bg-canvas px-3 text-body-sm"
            >
              <option value="">Všechny</option>
              {view.categories.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.labelCs}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <Button type="button" fullWidth disabled={pending} onClick={start}>
          Spustit ({view.itemCount} položek v packu)
        </Button>
      </section>

      <p className="text-center text-caption text-fg-muted">
        Ústní / školní vrstva:{" "}
        <Link href="/app/exam-profile" className="text-action underline">
          Profil maturity
        </Link>
      </p>

      {error ? (
        <Alert title="Chyba" tone="danger">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
