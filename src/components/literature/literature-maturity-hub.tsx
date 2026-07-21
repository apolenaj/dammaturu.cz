"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { LiteratureMaturityHubView } from "@/domain/learning/literature-maturity";
import {
  addLiteratureBookAction,
  drawLiteratureBookAction,
  importLiteratureFromExamProfileAction,
  importLiteratureFromMaterialsAction,
  removeLiteratureBookAction,
} from "@/server/actions/literature-maturity";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function bandTone(
  band: string,
): "neutral" | "danger" | "warning" | "success" | "brand" {
  if (band === "strong") return "success";
  if (band === "building") return "brand";
  if (band === "weak") return "warning";
  return "neutral";
}

export function LiteratureMaturityHub({
  initialView,
}: {
  initialView: LiteratureMaturityHubView;
}) {
  const [view, setView] = useState(initialView);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [showWeak, setShowWeak] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>) {
    setError(null);
    setInfo(null);
    startTransition(fn);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Badge tone="brand">Literatura k maturitě</Badge>
        <h1 className="font-display text-display-md text-fg">
          Seznam literatury
        </h1>
        <p className="text-body-md text-fg-secondary">
          Tvoje skutečně vybrané knihy. Pole se plní hlavně z ověřených
          materiálů — nic si nevymýšlíme.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          fullWidth
          disabled={pending || view.bookCount === 0}
          onClick={() =>
            run(async () => {
              const res = await drawLiteratureBookAction();
              if (!res.ok) {
                setError(res.error);
                return;
              }
              setView(res.view);
              setShowWeak(false);
              setInfo(`Vylosováno: ${res.book.titleCs}`);
            })
          }
        >
          {view.ctaDrawCs}
        </Button>
        <Button
          type="button"
          variant="secondary"
          fullWidth
          disabled={pending || view.bookCount === 0}
          onClick={() => {
            setShowWeak(true);
            setInfo(null);
          }}
        >
          {view.ctaWeakCs}
        </Button>
      </div>

      {view.drawn ? (
        <section className="rounded-2xl border border-action/40 bg-action/5 px-4 py-4">
          <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
            Vylosovaná kniha
          </p>
          <p className="mt-1 font-display text-xl text-fg">
            {view.drawn.titleCs}
          </p>
          <p className="text-body-sm text-fg-secondary">
            {view.drawn.authorCs ?? "Autor zatím neznámý"} · mastery{" "}
            {view.drawn.masteryScorePct} %
          </p>
          <Link
            href={view.drawn.href}
            className="mt-3 inline-flex text-body-sm font-semibold text-action hover:underline"
          >
            Otevřít kartu
          </Link>
        </section>
      ) : null}

      {showWeak ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-fg">Nejslabší knihy</h2>
          {view.weakest.length === 0 ? (
            <p className="text-body-sm text-fg-muted">Zatím nic k řazení.</p>
          ) : (
            <ul className="space-y-2">
              {view.weakest.map((b, i) => (
                <li key={b.id}>
                  <Link
                    href={b.href}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-canvas px-3 py-3 hover:border-action/40"
                  >
                    <span className="text-body-sm text-fg">
                      <span className="text-fg-muted">{i + 1}. </span>
                      {b.titleCs}
                    </span>
                    <Badge tone={bandTone(b.masteryBand)}>
                      {b.masteryScorePct} %
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-border bg-subtle/30 px-4 py-4">
        <h2 className="font-display text-lg text-fg">Přidat knihu</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Název díla"
            className="min-h-11 flex-1 rounded-md border border-border bg-canvas px-3 text-body-sm"
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Autor"
            className="min-h-11 flex-1 rounded-md border border-border bg-canvas px-3 text-body-sm"
          />
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const res = await addLiteratureBookAction({
                  titleCs: title,
                  authorCs: author,
                });
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setView(res.view);
                setTitle("");
                setAuthor("");
                setInfo(`Přidáno: ${res.book.titleCs}`);
              })
            }
          >
            Přidat
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const res = await importLiteratureFromExamProfileAction();
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setView(res.view);
                setInfo(
                  res.added > 0
                    ? `Importováno ${res.added} z Profilu maturity.`
                    : "Žádné nové knihy z Profilu maturity.",
                );
              })
            }
          >
            Import z Profilu maturity
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const res = await importLiteratureFromMaterialsAction();
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setView(res.view);
                setInfo(
                  `Aktualizováno ${res.booksTouched} knih z ověřených materiálů.`,
                );
              })
            }
          >
            Import z materiálů
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">
          Moje knihy ({view.bookCount})
        </h2>
        {view.emptyCs ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-body-sm text-fg-muted">
            {view.emptyCs}
          </p>
        ) : (
          <ul className="space-y-2">
            {view.books.map((b) => (
              <li
                key={b.id}
                className={cn(
                  "rounded-xl border border-border bg-canvas px-3 py-3",
                  view.drawn?.id === b.id && "border-action/50",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={b.href}
                      className="font-display text-body-md text-fg hover:text-action"
                    >
                      {b.titleCs}
                    </Link>
                    <p className="text-caption text-fg-secondary">
                      {b.authorCs ?? "Autor —"} · {b.fieldsFilled}/12 polí ·{" "}
                      {b.sourceMixCs}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={bandTone(b.masteryBand)}>
                      {b.masteryBandCs} · {b.masteryScorePct} %
                    </Badge>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          const res = await removeLiteratureBookAction({
                            bookId: b.id,
                          });
                          if (!res.ok) {
                            setError(res.error);
                            return;
                          }
                          setView(res.view);
                        })
                      }
                      className="text-caption font-semibold text-danger hover:underline"
                    >
                      Smazat
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {info ? (
        <Alert title="Hotovo" tone="success">
          {info}
        </Alert>
      ) : null}
      {error ? (
        <Alert title="Chyba" tone="danger">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
