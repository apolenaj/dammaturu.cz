"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  literatureFieldKeys,
  literatureFieldLabelsCs,
  type LiteratureBook,
  type LiteratureFieldKey,
} from "@/domain/learning/literature-maturity";
import {
  practiceLiteratureBookAction,
  updateLiteratureFieldAction,
} from "@/server/actions/literature-maturity";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function LiteratureBookDetail({
  initialBook,
}: {
  initialBook: LiteratureBook;
}) {
  const [book, setBook] = useState(initialBook);
  const [editing, setEditing] = useState<LiteratureFieldKey | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEdit(key: LiteratureFieldKey) {
    setEditing(key);
    setDraft(book.fields[key].valueCs ?? "");
  }

  function saveField() {
    if (!editing) return;
    const key = editing;
    setError(null);
    startTransition(async () => {
      const res = await updateLiteratureFieldAction({
        bookId: book.id,
        key,
        valueCs: draft,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBook(res.book);
      setEditing(null);
    });
  }

  return (
    <div className="space-y-6">
      <Link
        href="/app/literature"
        className="text-body-sm font-semibold text-action hover:underline"
      >
        ← Seznam literatury
      </Link>

      <header className="space-y-2">
        <Badge tone="brand">Karta díla</Badge>
        <h1 className="font-display text-display-md text-fg">{book.titleCs}</h1>
        <p className="text-body-md text-fg-secondary">
          {book.fields.author.valueCs ?? "Autor zatím neznámý"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">
            Mastery {book.mastery.scorePct} % · {book.mastery.fieldsFilled}/12
          </Badge>
          <Badge tone="info">
            Procvičení: {book.mastery.practiceCount}×
          </Badge>
          {book.platformWorkSlug ? (
            <Link
              href={`/app/learn/dilo/${book.platformWorkSlug}`}
              className="text-caption font-semibold text-action hover:underline"
            >
              Otevřít rozbor v appce
            </Link>
          ) : null}
        </div>
      </header>

      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await practiceLiteratureBookAction({ bookId: book.id });
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setBook(res.book);
          })
        }
      >
        Zaznamenat procvičení (ústní)
      </Button>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-fg">Pole k maturitě</h2>
        <ul className="space-y-3">
          {literatureFieldKeys.map((key) => {
            const field = book.fields[key];
            const isEdit = editing === key;
            return (
              <li
                key={key}
                className="rounded-xl border border-border bg-canvas px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-fg">
                    {literatureFieldLabelsCs[key]}
                  </p>
                  <Badge tone="neutral">{field.sourceLabelCs}</Badge>
                </div>
                {isEdit ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-body-sm"
                    />
                    <div className="flex gap-2">
                      <Button type="button" disabled={pending} onClick={saveField}>
                        Uložit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setEditing(null)}
                      >
                        Zrušit
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-1 whitespace-pre-wrap text-body-sm text-fg-secondary">
                      {field.valueCs?.trim() ||
                        "— prázdné (doplň z materiálu nebo ručně)"}
                    </p>
                    <button
                      type="button"
                      onClick={() => startEdit(key)}
                      className="mt-2 text-caption font-semibold text-action hover:underline"
                    >
                      Upravit
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {error ? (
        <Alert title="Chyba" tone="danger">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
