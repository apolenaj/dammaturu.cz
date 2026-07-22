"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { runVysvetliMiToAction } from "@/server/actions/vysvetli-mi-to";
import {
  VYSVETLI_DISCLAIMER_CS,
  vysvetliSourceKindLabelsCs,
  vysvetliTaskHintsCs,
  vysvetliTaskLabelsCs,
  vysvetliTasks,
  type VysvetliResponse,
  type VysvetliTask,
} from "@/domain/learning/vysvetli-mi-to";
import { evidenceConfidenceLabelsCs } from "@/domain/learning/grounded-study";
import type { LearnerMaterialListItem } from "@/domain/learning/learner-materials";
import {
  ConfidenceBadge,
  SourceCitationPanel,
} from "@/components/materials/source-citation-panel";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function VysvetliMiToAssistant({
  materials,
  aiExplanationsEntitled,
}: {
  materials: LearnerMaterialListItem[];
  aiExplanationsEntitled: boolean;
}) {
  const [task, setTask] = useState<VysvetliTask>("summarize_topic");
  const [query, setQuery] = useState("");
  const [selectedParagraph, setSelectedParagraph] = useState("");
  const [compareWith, setCompareWith] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    materials.slice(0, 4).map((m) => m.id),
  );
  const [includeCatalog, setIncludeCatalog] = useState(true);
  const [response, setResponse] = useState<VysvetliResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleMaterial(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await runVysvetliMiToAction({
        task,
        query: query.trim() || selectedParagraph.trim() || "téma",
        selectedParagraph: selectedParagraph.trim() || undefined,
        compareWith: compareWith.trim() || undefined,
        studentAnswer: studentAnswer.trim() || undefined,
        materialIds: selectedIds,
        includeApprovedCatalog: includeCatalog,
      });
      if (!res.ok) {
        setError(res.error);
        setResponse(null);
        return;
      }
      setResponse(res.response);
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <header className="space-y-2">
        <Badge tone="info">Vysvětli mi to</Badge>
        <h1 className="font-display text-display-md text-fg">
          Vysvětli mi to
        </h1>
        <p className="text-body-md text-fg-secondary">{VYSVETLI_DISCLAIMER_CS}</p>
        <p className="text-caption text-fg-muted">
          {aiExplanationsEntitled
            ? "AI vysvětlení je v plánu, ale jádro vždy běží ze zdrojů — když AI není, učení pokračuje."
            : "Jádro funguje bez AI ze zdrojů. Flashcards, kvízy, testy a opakování na AI nezávisí."}
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-border bg-subtle/30 px-4 py-5">
        <fieldset className="space-y-2">
          <legend className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
            Úkol
          </legend>
          <ul className="space-y-2">
            {vysvetliTasks.map((t) => {
              const on = task === t;
              return (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => setTask(t)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition",
                      on
                        ? "border-action bg-action/10"
                        : "border-border bg-canvas",
                    )}
                  >
                    <p className="font-semibold text-fg">
                      {vysvetliTaskLabelsCs[t]}
                    </p>
                    <p className="text-caption text-fg-secondary">
                      {vysvetliTaskHintsCs[t]}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>

        {task === "explain_paragraph" ? (
          <div className="space-y-2">
            <label className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Odstavec ze zdroje
            </label>
            <textarea
              value={selectedParagraph}
              onChange={(e) => setSelectedParagraph(e.target.value)}
              rows={5}
              placeholder="Vlož odstavec z materiálu…"
              className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-body-md text-fg"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              {task === "compare_concepts" ? "První pojem" : "Téma / dotaz"}
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-body-md text-fg"
              placeholder={
                task === "why_wrong"
                  ? "Téma nebo otázka"
                  : "Např. romantismus, Máj, Mácha…"
              }
            />
          </div>
        )}

        {task === "compare_concepts" ? (
          <div className="space-y-2">
            <label className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Druhý pojem
            </label>
            <input
              value={compareWith}
              onChange={(e) => setCompareWith(e.target.value)}
              className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-body-md text-fg"
              placeholder="Např. realismus"
            />
          </div>
        ) : null}

        {task === "why_wrong" ? (
          <div className="space-y-2">
            <label className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Tvoje odpověď
            </label>
            <textarea
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              rows={4}
              placeholder="Vlož odpověď, kterou chceš zkontrolovat vůči zdroji…"
              className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-body-md text-fg"
            />
          </div>
        ) : null}

        {materials.length > 0 ? (
          <fieldset className="space-y-2">
            <legend className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Nahrané materiály
            </legend>
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {materials.map((m) => {
                const on = selectedIds.includes(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => toggleMaterial(m.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left text-body-sm",
                        on
                          ? "border-action bg-action/10"
                          : "border-border bg-canvas",
                      )}
                    >
                      {m.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ) : (
          <Alert title="Zatím bez nahraných materiálů" tone="warning">
            Můžeš stále použít schválený katalog ČJL. Pro vlastní texty nahraj
            soubory v Moje materiály.
          </Alert>
        )}

        <label className="flex items-start gap-2 text-body-sm text-fg">
          <input
            type="checkbox"
            checked={includeCatalog}
            onChange={(e) => setIncludeCatalog(e.target.checked)}
            className="mt-1"
          />
          <span>
            Zahrnout schválený katalog ČJL (oficiální DOCX allowlist) jako
            autoritativní zdroj.
          </span>
        </label>

        {error ? (
          <Alert title="Teď to nejde" tone="danger">
            <p>{error}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={submit}>
                Zkusit znovu
              </Button>
              <Link
                href="/app/materials"
                className="inline-flex min-h-11 items-center text-body-sm font-semibold text-action underline-offset-2 hover:underline"
              >
                Vrátit se k materiálům
              </Link>
              <Link
                href="/app/learn"
                className="inline-flex min-h-11 items-center text-body-sm font-semibold text-action underline-offset-2 hover:underline"
              >
                Pokračovat offline
              </Link>
            </div>
          </Alert>
        ) : null}

        <Button fullWidth disabled={pending} onClick={submit}>
          {pending ? "Hledám ve zdrojích…" : "Vysvětli mi to"}
        </Button>
      </section>

      {response ? (
        <section className="space-y-4 rounded-2xl border border-border bg-surface px-4 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl text-fg">{response.titleCs}</h2>
            <ConfidenceBadge confidence={response.confidence} />
          </div>

          {response.insufficient ? (
            <Alert title="Nedostatek podkladů" tone="warning">
              {response.bodyCs}
            </Alert>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-body-md text-fg">
              {response.bodyCs}
            </pre>
          )}

          {response.mnemonicCs ? (
            <p className="rounded-lg bg-subtle px-3 py-2 text-body-sm text-fg">
              {response.mnemonicCs}
            </p>
          ) : null}

          {response.followUps.length > 0 ? (
            <ol className="list-decimal space-y-2 pl-5 text-body-sm text-fg">
              {response.followUps.map((fu) => (
                <li key={fu.id}>
                  <p className="font-semibold">{fu.questionCs}</p>
                  <p className="text-caption text-fg-muted">
                    Klíč ze zdroje: {fu.expectedKeyCs}
                  </p>
                </li>
              ))}
            </ol>
          ) : null}

          {(response.correctPoints.length > 0 ||
            response.missingPoints.length > 0 ||
            response.wrongPoints.length > 0) && (
            <div className="space-y-2 text-body-sm">
              {response.correctPoints.length > 0 ? (
                <p>
                  <span className="font-semibold">Správně: </span>
                  {response.correctPoints.join(", ")}
                </p>
              ) : null}
              {response.missingPoints.length > 0 ? (
                <p>
                  <span className="font-semibold">Chybí: </span>
                  {response.missingPoints.join(", ")}
                </p>
              ) : null}
              {response.wrongPoints.length > 0 ? (
                <p>
                  <span className="font-semibold">Problematické: </span>
                  {response.wrongPoints.join(" ")}
                </p>
              ) : null}
            </div>
          )}

          {response.citations.length > 0 ? (
            <div className="space-y-2">
              <p className="text-caption font-semibold text-fg-muted">
                Zdroje
              </p>
              <ul className="space-y-1 text-caption text-fg-secondary">
                {response.citations.map((c, i) => (
                  <li key={`${c.documentId}-${i}`}>
                    {vysvetliSourceKindLabelsCs[c.sourceKind]} ·{" "}
                    {c.documentTitle}
                    {c.sourceRef ? ` · ${c.sourceRef}` : ""}
                  </li>
                ))}
              </ul>
              <SourceCitationPanel citations={response.citations} />
            </div>
          ) : null}

          <p className="text-caption text-fg-muted">
            {evidenceConfidenceLabelsCs[response.confidence]}
            {response.aiNoteCs ? ` · ${response.aiNoteCs}` : ""}
          </p>
          <p className="text-caption text-fg-muted">{response.disclaimerCs}</p>
        </section>
      ) : null}

      <p className="text-center">
        <Link
          href="/app/materials"
          className="text-body-sm font-semibold text-action hover:underline"
        >
          ← Moje materiály
        </Link>
      </p>
    </div>
  );
}
