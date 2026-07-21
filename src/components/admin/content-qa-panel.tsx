"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  reviewQaItemAction,
  runContentQaAction,
} from "@/server/actions/content-qa";
import type {
  ContentQaItem,
  ContentQaRunResult,
  QaValidationStatus,
} from "@/server/content-qa/types";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function statusTone(
  status: QaValidationStatus,
): "neutral" | "accent" | "success" | "warning" | "brand" {
  switch (status) {
    case "verified_from_source":
      return "success";
    case "corrected":
      return "brand";
    case "rejected":
      return "neutral";
    case "needs_fact_check":
    default:
      return "warning";
  }
}

function flagTone(
  code: string,
): "neutral" | "accent" | "success" | "warning" | "brand" {
  if (
    code === "death_before_birth" ||
    code === "impossible_chronology" ||
    code === "conflicting_data"
  ) {
    return "warning";
  }
  if (code === "awaiting_expert_review") return "accent";
  return "neutral";
}

export function ContentQaPanel({
  items,
  lastRun,
}: {
  items: ContentQaItem[];
  lastRun: ContentQaRunResult | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "flagged" | QaValidationStatus>(
    "flagged",
  );

  function onRun() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await runContentQaAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(
        `QA hotovo: ${res.result.scanned} skenováno, ${res.result.flagged} auto-flag, ${res.result.cleanPendingReview} čeká na odbornou kontrolu.`,
      );
      router.refresh();
    });
  }

  const filtered = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "flagged") {
      return item.flags.some((f) => f.code !== "awaiting_expert_review");
    }
    return item.validationStatus === filter;
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-md text-fg">Content QA</h1>
          <p className="mt-2 max-w-2xl text-body-md text-fg-secondary">
            SOURCE → NORMALIZED → status → reviewer note → FINAL. Automatika
            jen flaguje; historické fakty se nikdy neopravují bez auditovatelné
            poznámky.
          </p>
        </div>
        <Button onClick={onRun} disabled={pending}>
          {pending ? "Běží…" : "Spustit QA scan"}
        </Button>
      </div>

      {error ? (
        <Alert tone="danger" title="QA selhala">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert tone="success" title="QA dokončena">
          {success}
        </Alert>
      ) : null}

      {lastRun ? (
        <Card>
          <CardHeader>
            <CardTitle>Poslední běh</CardTitle>
            <CardDescription>
              {lastRun.finishedAt} · scanned {lastRun.scanned} · flagged{" "}
              {lastRun.flagged} · expert queue {lastRun.cleanPendingReview}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["flagged", "Podezřelé"],
            ["needs_fact_check", "Needs check"],
            ["verified_from_source", "Verified"],
            ["corrected", "Corrected"],
            ["rejected", "Rejected"],
            ["all", "Vše"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "primary" : "outline"}
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <p className="text-caption text-fg-muted">
        {filtered.length} / {items.length} položek
      </p>

      <div className="space-y-4">
        {filtered.slice(0, 60).map((item) => (
          <QaReviewCard key={item.id} item={item} disabled={pending} />
        ))}
        {filtered.length === 0 ? (
          <Card>
            <CardDescription>
              Žádné položky — spusť QA scan (po ingestu).
            </CardDescription>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function QaReviewCard({
  item,
  disabled,
}: {
  item: ContentQaItem;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState(item.reviewerNote ?? "");
  const [finalText, setFinalText] = useState(
    item.publishedStatement ?? item.normalizedStatement,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [localOk, setLocalOk] = useState<string | null>(null);

  function submit(
    action: "verify" | "correct" | "reject" | "reopen",
  ) {
    setLocalError(null);
    setLocalOk(null);
    startTransition(async () => {
      const decision =
        action === "verify"
          ? {
              action: "verify" as const,
              publishedStatement: finalText,
              reviewerNote: note,
            }
          : action === "correct"
            ? {
                action: "correct" as const,
                publishedStatement: finalText,
                reviewerNote: note,
              }
            : action === "reject"
              ? { action: "reject" as const, reviewerNote: note }
              : { action: "reopen" as const, reviewerNote: note };

      const res = await reviewQaItemAction(item.id, decision);
      if (!res.ok) {
        setLocalError(res.error);
        return;
      }
      setLocalOk(`Uloženo: ${res.item.validationStatus}`);
      router.refresh();
    });
  }

  const reason = item.flags.map((f) => `${f.code}: ${f.reason}`).join(" · ");

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-body-sm font-semibold text-fg">{item.title}</p>
            <p className="mt-1 text-caption text-fg-muted">
              {item.filename} · {item.kind}
            </p>
          </div>
          <Badge tone={statusTone(item.validationStatus)}>
            {item.validationStatus}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FieldBlock label="SOURCE" value={item.sourceStatement} />
          <FieldBlock label="NORMALIZED" value={item.normalizedStatement} />
          <FieldBlock
            label="FINAL"
            value={item.publishedStatement ?? "— (nepublikováno)"}
            muted={!item.publishedStatement}
          />
          <FieldBlock label="REASON" value={reason || "—"} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {item.flags.map((f, i) => (
            <Badge key={`${f.code}-${i}`} tone={flagTone(f.code)}>
              {f.code}
            </Badge>
          ))}
        </div>

        {item.reviewerNote ? (
          <p className="text-caption text-fg-secondary">
            Poslední note ({item.reviewedBy ?? "?"} · {item.reviewedAt}):{" "}
            {item.reviewerNote}
          </p>
        ) : null}

        <div className="space-y-2 border-t border-border pt-4">
          <Label htmlFor={`note-${item.id}`}>Reviewer note (povinná)</Label>
          <Textarea
            id={`note-${item.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Auditovatelná poznámka — proč verify / co se opravuje / proč reject…"
            rows={2}
            disabled={disabled || pending}
          />
          <Label htmlFor={`final-${item.id}`}>FINAL (pro verify / correct)</Label>
          <Textarea
            id={`final-${item.id}`}
            value={finalText}
            onChange={(e) => setFinalText(e.target.value)}
            rows={3}
            disabled={disabled || pending}
          />
          {localError ? (
            <Alert tone="danger" title="Akce selhala">
              {localError}
            </Alert>
          ) : null}
          {localOk ? (
            <Alert tone="success" title="Uloženo">
              {localOk}
            </Alert>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={disabled || pending}
              onClick={() => submit("verify")}
            >
              Ověřit ze zdroje
            </Button>
            <Button
              size="sm"
              variant="accent"
              disabled={disabled || pending}
              onClick={() => submit("correct")}
            >
              Opravit (+ note)
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={disabled || pending}
              onClick={() => submit("reject")}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled || pending}
              onClick={() => submit("reopen")}
            >
              Znovu otevřít
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function FieldBlock({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-subtle/40 p-3">
      <p className="text-caption font-semibold tracking-wide text-fg-muted">
        {label}
      </p>
      <p
        className={`mt-1 text-body-sm ${muted ? "text-fg-muted" : "text-fg"}`}
      >
        {value}
      </p>
    </div>
  );
}
