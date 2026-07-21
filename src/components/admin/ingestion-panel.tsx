"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runIngestionAction } from "@/server/actions/ingestion";
import type {
  AuditLogEntry,
  IngestedSourceDocument,
  IngestionRunResult,
} from "@/server/ingestion/types";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function statusTone(
  status: IngestedSourceDocument["pipelineStatus"],
): "neutral" | "accent" | "success" | "warning" | "brand" {
  switch (status) {
    case "needs_review":
      return "warning";
    case "verified":
      return "brand";
    case "published":
      return "success";
    case "parsed":
      return "accent";
    default:
      return "neutral";
  }
}

export function IngestionPanel({
  documents,
  lastRun,
  audit,
}: {
  documents: IngestedSourceDocument[];
  lastRun: IngestionRunResult | null;
  audit: AuditLogEntry[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onRun() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await runIngestionAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(
        `Hotovo: +${res.result.imported} import, ${res.result.updated} update, ${res.result.unchanged} beze změny, ${res.result.skippedNotAllowed} odmítnuto.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-fg">Zdroje</h1>
          <p className="mt-2 max-w-2xl text-body-md text-fg-secondary">
            Bezpečný import DOCX z{" "}
            <code className="text-body-sm">content/source-materials</code>.
            Původní soubory se nepřepisují. Výstup končí ve stavu{" "}
            <strong>needs_review</strong> — nikdy automaticky verified/published.
          </p>
        </div>
        <Button onClick={onRun} disabled={pending}>
          {pending ? "Importuji…" : "Spustit import"}
        </Button>
      </div>

      {error ? (
        <Alert tone="danger" title="Import selhal">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert tone="success" title="Import dokončen">
          {success}
        </Alert>
      ) : null}

      {lastRun ? (
        <Card>
          <CardHeader>
            <CardTitle>Poslední běh</CardTitle>
            <CardDescription>
              {new Date(lastRun.finishedAt).toLocaleString("cs-CZ")} · run{" "}
              {lastRun.runId.slice(0, 8)}
            </CardDescription>
          </CardHeader>
          <dl className="grid grid-cols-2 gap-3 text-body-sm sm:grid-cols-5">
            <div>
              <dt className="text-fg-muted">Import</dt>
              <dd className="font-semibold">{lastRun.imported}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Update</dt>
              <dd className="font-semibold">{lastRun.updated}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Beze změny</dt>
              <dd className="font-semibold">{lastRun.unchanged}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Odmítnuto</dt>
              <dd className="font-semibold">{lastRun.skippedNotAllowed}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Chyby</dt>
              <dd className="font-semibold">{lastRun.failed}</dd>
            </div>
          </dl>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-title-sm text-fg">
          Importované dokumenty ({documents.length})
        </h2>
        {documents.length === 0 ? (
          <Card>
            <CardDescription>
              Zatím nic. Spusť import allowlistovaných maturitních DOCX.
            </CardDescription>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-body-sm font-semibold text-fg">
                    {doc.filename}
                  </p>
                  <p className="mt-1 text-caption text-fg-muted">
                    {doc.title} · v{doc.version} ·{" "}
                    {doc.wordCountEst.toLocaleString("cs-CZ")} slov · sha{" "}
                    {doc.contentSha256.slice(0, 10)}…
                  </p>
                </div>
                <Badge tone={statusTone(doc.pipelineStatus)}>
                  {doc.pipelineStatus}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-caption text-fg-secondary">
                <span>{doc.chunks.length} chunks</span>
                <span>·</span>
                <span>{doc.topics.length} topics</span>
                <span>·</span>
                <span>{doc.knowledgeUnits.length} KU návrhů</span>
              </div>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-title-sm text-fg">Audit log</h2>
        <Card>
          {audit.length === 0 ? (
            <CardDescription>Zatím prázdný.</CardDescription>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {audit.map((entry) => (
                <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-caption text-fg-muted">
                    {new Date(entry.at).toLocaleString("cs-CZ")} · {entry.actor}{" "}
                    · {entry.action}
                  </p>
                  <p className="text-body-sm text-fg">
                    {entry.filename ? `${entry.filename}: ` : ""}
                    {entry.detail}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
