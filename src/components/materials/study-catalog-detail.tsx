"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  contentStatusLabelsCs,
  type StudyContentEntry,
  type StudyContentProgress,
} from "@/domain/study-content/registry";
import { submitCatalogQuickTestAction } from "@/server/actions/study-content";
import { startCatalogLearningSessionAction } from "@/server/actions/learning-session";
import type { LearningSession } from "@/domain/learning/learning-session-engine";
import type {
  CatalogLearnStep,
  CatalogQuickTestItem,
} from "@/server/study-content/session-build";
import { LearningSessionPlayer } from "@/components/learning/learning-session-player";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type CatalogMode = "overview" | "learn" | "test" | "source";

export function StudyCatalogDetail({
  entry,
  initialProgress,
  learnSteps: _unusedLearnSteps,
  quickTest,
  initialMode = "overview",
  continueLearning = false,
}: {
  entry: StudyContentEntry;
  initialProgress: StudyContentProgress | null;
  /** Kept for page compatibility; learn mode now uses the session engine. */
  learnSteps: CatalogLearnStep[];
  quickTest: CatalogQuickTestItem[];
  initialMode?: CatalogMode;
  continueLearning?: boolean;
}) {
  void _unusedLearnSteps;  const [mode, setMode] = useState<CatalogMode>(
    continueLearning ? "learn" : initialMode,
  );
  const [progress, setProgress] = useState(initialProgress);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [testIndex, setTestIndex] = useState(0);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canStudy =
    entry.contentStatus === "available" ||
    entry.contentStatus === "available_with_warning";

  const testItem = quickTest[testIndex] ?? null;

  function startLearningSession() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await startCatalogLearningSessionAction({
          sourceId: entry.sourceId,
          preferUnitId: initialProgress?.completedUnitIds.at(-1) ?? null,
        });
        if (!res.ok) {
          setError(res.error);
          setSession(null);
          return;
        }
        setSession(res.session);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Nepovedlo se spustit učení.",
        );
        setSession(null);
      }
    });
  }

  useEffect(() => {
    if (mode !== "learn" || !canStudy || session) return;
    startLearningSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once when entering learn
  }, [mode, canStudy]);

  const tabs: Array<{ id: CatalogMode; label: string }> = [
    { id: "overview", label: "Přehled" },
    { id: "learn", label: "Učení" },
    { id: "test", label: "Rychlý test" },
    { id: "source", label: "Zdroj" },
  ];

  const completedChunks = progress?.completedChunkIds.length ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/app/materials"
        className="text-body-sm font-semibold text-action hover:underline"
      >
        ← Moje materiály
      </Link>

      <header className="space-y-2">
        <p className="text-overline text-action">{entry.subject}</p>
        <h1 className="font-display text-display-sm text-fg">{entry.title}</h1>
        <p className="text-body-sm text-fg-secondary">
          {entry.topic}
          {entry.subtopic ? ` · ${entry.subtopic}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge
            tone={
              entry.contentStatus === "available"
                ? "success"
                : entry.contentStatus === "available_with_warning"
                  ? "warning"
                  : "danger"
            }
          >
            {contentStatusLabelsCs[entry.contentStatus]}
          </Badge>
          <Badge tone="neutral">
            {entry.chunks.length} úseků · {entry.knowledgeUnits.length} jednotek
          </Badge>
          {progress ? (
            <Badge tone="info">Přečteno {completedChunks}</Badge>
          ) : null}
        </div>
      </header>

      {!entry.parseComplete ? (
        <Alert tone="warning" title="Neúplná extrakce textu">
          Interaktivní vrstva je omezená. Použij původní soubor.
          <div className="mt-3">
            <a
              href={`/api/study-content/${entry.sourceId}/original`}
              className="font-semibold text-action underline"
            >
              Zobrazit původní materiál
            </a>
          </div>
        </Alert>
      ) : null}

      {entry.provenance.warnings.length > 0 ? (
        <Alert tone="info" title="Upozornění ke zdroji">
          <ul className="mt-1 list-disc space-y-1 pl-4 text-body-sm">
            {entry.provenance.warnings.slice(0, 6).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setMode(t.id);
              setError(null);
              setTestFeedback(null);
              if (t.id !== "learn") setSession(null);
            }}
            className={cn(
              "rounded-lg px-3 py-2 text-body-sm font-semibold transition",
              mode === t.id
                ? "bg-action text-fg-on-brand"
                : "bg-subtle text-fg-secondary hover:bg-surface",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error ? (
        <Alert tone="danger" title="Chyba">
          {error}
        </Alert>
      ) : null}

      {mode === "overview" ? (
        <OverviewPanel
          entry={entry}
          canStudy={canStudy}
          onLearn={() => setMode("learn")}
          onTest={() => setMode("test")}
        />
      ) : null}

      {mode === "learn" && canStudy ? (
        session ? (
          <LearningSessionPlayer
            session={session}
            onExit={() => {
              setSession(null);
              setMode("overview");
            }}
          />
        ) : pending ? (
          <p className="text-body-sm text-fg-muted">
            Připravuji učební session…
          </p>
        ) : (
          <div className="space-y-3">
            <Alert tone="info" title="Učení ze zdroje">
              Session používá vybavení před odhalením odpovědi — bez AI.
            </Alert>
            <Button
              type="button"
              onClick={startLearningSession}
              disabled={pending}
            >
              Spustit učení
            </Button>
          </div>
        )
      ) : null}

      {mode === "test" && canStudy ? (
        <TestPanel
          item={testItem}
          index={testIndex}
          total={quickTest.length}
          feedback={testFeedback}
          pending={pending}
          onAnswer={(answeredTrue) => {
            if (!testItem) return;
            startTransition(async () => {
              const res = await submitCatalogQuickTestAction({
                sourceId: entry.sourceId,
                itemId: testItem.id,
                answeredTrue,
                correctIsTrue: testItem.correctIsTrue,
              });
              if (!res.ok) {
                setError(res.error);
                return;
              }
              setProgress(res.progress);
              setTestFeedback(
                res.correct
                  ? "Správně — tvrzení sedí se zdrojem."
                  : "Špatně — podívej se na úryvek ze zdroje.",
              );
            });
          }}
          onNext={() => {
            setTestFeedback(null);
            setTestIndex((i) =>
              Math.min(i + 1, Math.max(0, quickTest.length - 1)),
            );
          }}
        />
      ) : null}

      {mode === "source" ? <SourcePanel entry={entry} /> : null}
    </div>
  );
}

function OverviewPanel({
  entry,
  canStudy,
  onLearn,
  onTest,
}: {
  entry: StudyContentEntry;
  canStudy: boolean;
  onLearn: () => void;
  onTest: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {canStudy ? (
          <>
            <Button type="button" onClick={onLearn}>
              Začít učení
            </Button>
            <Button type="button" variant="outline" onClick={onTest}>
              Rychlý test
            </Button>
          </>
        ) : null}
        <a
          href={`/api/study-content/${entry.sourceId}/original`}
          className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-body-sm font-semibold text-fg hover:bg-subtle"
        >
          Zobrazit původní materiál
        </a>
      </div>

      {entry.relatedHrefs.length > 0 ? (
        <div>
          <h2 className="font-display text-lg font-semibold text-fg">
            Související aktivity
          </h2>
          <ul className="mt-2 space-y-1">
            {entry.relatedHrefs.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="text-action hover:underline">
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h2 className="font-display text-lg font-semibold text-fg">
          Úseky ze zdroje
        </h2>
        <ol className="mt-3 space-y-3">
          {entry.chunks.slice(0, 5).map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-border bg-surface p-3 text-body-sm text-fg-secondary"
            >
              {c.headingPath ? (
                <p className="mb-1 font-semibold text-fg">{c.headingPath}</p>
              ) : (
                <p className="mb-1 text-caption text-fg-muted">
                  Úsek {c.chunkIndex + 1}
                  {c.charStart != null
                    ? ` · znaky ${c.charStart}–${c.charEnd ?? "?"}`
                    : ""}
                </p>
              )}
              <p className="whitespace-pre-wrap">
                {c.text.slice(0, 320)}
                {c.text.length > 320 ? "…" : ""}
              </p>
            </li>
          ))}
        </ol>
        {entry.chunks.length > 5 ? (
          <p className="mt-2 text-caption text-fg-muted">
            +{entry.chunks.length - 5} dalších úseků v režimu Učení
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TestPanel({
  item,
  index,
  total,
  feedback,
  pending,
  onAnswer,
  onNext,
}: {
  item: CatalogQuickTestItem | null;
  index: number;
  total: number;
  feedback: string | null;
  pending: boolean;
  onAnswer: (answeredTrue: boolean) => void;
  onNext: () => void;
}) {
  if (total === 0) {
    return (
      <Alert tone="info" title="Zatím bez testu">
        Pro tento materiál ještě nejsou navržené jednotky znalostí z textu.
        Použij režim Učení nebo původní soubor.
      </Alert>
    );
  }
  if (!item) {
    return (
      <Alert tone="success" title="Test dokončen">
        Prošels všechny otázky z tohoto materiálu.
      </Alert>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-5 lg:pb-5">
      <p className="text-caption text-fg-muted">
        Otázka {index + 1} / {total}
      </p>
      <h2 className="font-display text-xl font-semibold text-fg">{item.prompt}</h2>
      <p className="rounded-lg bg-subtle px-3 py-2 text-body-md text-fg">
        {item.statement}
      </p>
      {item.sourceExcerpt ? (
        <div>
          <p className="text-caption font-semibold text-fg-muted">
            Úryvek ze zdroje
            {item.headingPath ? ` · ${item.headingPath}` : ""}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-body-sm text-fg-secondary">
            {item.sourceExcerpt}
          </p>
        </div>
      ) : null}

      {feedback ? (
        <Alert
          tone={feedback.startsWith("Správně") ? "success" : "warning"}
          title={feedback.startsWith("Správně") ? "Správně" : "Špatně"}
        >
          {feedback}
          <div className="mt-3">
            <Button type="button" size="sm" onClick={onNext}>
              Další otázka
            </Button>
          </div>
        </Alert>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => onAnswer(true)}
          >
            Ano / pravda
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onAnswer(false)}
          >
            Ne / nepatří
          </Button>
        </div>
      )}
    </div>
  );
}

function SourcePanel({ entry }: { entry: StudyContentEntry }) {
  const p = entry.provenance;
  const meta = useMemo(
    () => [
      ["Soubor", p.originalFilename],
      ["Cesta", p.inventoryPath],
      ["SHA-256", p.contentSha256 ?? "—"],
      ["Ingest id", p.ingestionDocumentId ?? "—"],
      ["Stav pipeline", p.pipelineStatus ?? "—"],
      ["Velikost", p.sizeBytes != null ? `${p.sizeBytes} B` : "—"],
      ["Úseky", String(p.chunkCount)],
      ["Jednotky", String(p.knowledgeUnitCount)],
    ],
    [p],
  );

  return (
    <div className="space-y-4">
      <a
        href={`/api/study-content/${entry.sourceId}/original`}
        className="inline-flex min-h-11 items-center rounded-lg bg-action px-4 text-body-sm font-semibold text-fg-on-brand hover:bg-action-hover"
      >
        Zobrazit původní materiál
      </a>
      <dl className="space-y-2 rounded-xl border border-border bg-surface p-4 text-body-sm">
        {meta.map(([k, v]) => (
          <div key={k} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
            <dt className="text-fg-muted">{k}</dt>
            <dd className="break-all text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      {!entry.parseComplete ? (
        <Alert tone="warning" title="Parsing neúplný">
          Interaktivní text nemusí pokrývat celý dokument. Spolehlivý je původní
          soubor.
        </Alert>
      ) : null}
    </div>
  );
}
