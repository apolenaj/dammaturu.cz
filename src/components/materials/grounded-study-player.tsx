"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  INSUFFICIENT_EVIDENCE_CS,
  type GroundedExplanation,
  type GroundedGradeResult,
  type GroundedStudyItem,
  type GroundedStudySession,
} from "@/domain/learning/grounded-study";
import {
  explainFromMyMaterialsAction,
  gradeGroundedStudyAnswerAction,
} from "@/server/actions/grounded-study";
import {
  ConfidenceBadge,
  SourceCitationPanel,
} from "@/components/materials/source-citation-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function GroundedStudyPlayer({
  session,
}: {
  session: GroundedStudySession;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<GroundedGradeResult | null>(null);
  const [query, setQuery] = useState("");
  const [explanation, setExplanation] = useState<GroundedExplanation | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const item: GroundedStudyItem | undefined = session.items[index];
  const done = index >= session.items.length;

  const progressLabel = useMemo(() => {
    if (done) return "Hotovo";
    return `${index + 1} / ${session.items.length}`;
  }, [done, index, session.items.length]);

  function onSubmit() {
    if (!item) return;
    setError(null);
    startTransition(async () => {
      const res = await gradeGroundedStudyAnswerAction({
        item,
        studentAnswer: answer,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setGrade(res.grade);
    });
  }

  function onNext() {
    setGrade(null);
    setAnswer("");
    setIndex((i) => i + 1);
  }

  function onAsk() {
    setError(null);
    startTransition(async () => {
      const res = await explainFromMyMaterialsAction({
        materialIds: session.materialIds,
        query,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setExplanation(res.explanation);
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/app/materials"
          className="text-body-sm font-semibold text-action hover:underline"
        >
          ← Moje materiály
        </Link>
        <Badge tone="neutral">{progressLabel}</Badge>
      </div>

      <div>
        <h1 className="font-display text-display-sm text-fg">
          Učit se z mých materiálů
        </h1>
        <p className="mt-1 text-body-sm text-fg-secondary">
          Odpovědi a hodnocení vycházejí jen z:{" "}
          {session.materialTitles.join(", ")}. Nic si nevymýšlíme.
        </p>
        {session.skippedNeedsReview > 0 ? (
          <p className="mt-1 text-caption text-fg-muted">
            {session.skippedNeedsReview} bodů vyžaduje kontrolu — do kvízu jsme
            je nezařadili.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-body-sm text-danger">
          {error}
        </p>
      ) : null}

      {done ? (
        <Card>
          <CardHeader>
            <CardTitle>Sesit hotový</CardTitle>
            <CardDescription>
              Prošel jsi {session.items.length} otázek ze svých materiálů. Můžeš
              se zeptat na vysvětlení níže — pořád jen ze zdroje.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : item ? (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <ConfidenceBadge confidence={item.confidence} />
              {item.topic ? <Badge tone="neutral">{item.topic}</Badge> : null}
            </div>
            <CardTitle className="text-title-md">{item.prompt}</CardTitle>
            <CardDescription>
              Odpověz podle nahraného textu. Když si nejsi jistý, otevři zdroj —
              nehádej.
            </CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            <textarea
              className="min-h-28 w-full rounded-lg border border-border bg-surface px-3 py-2 text-body-md text-fg"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Napiš odpověď vlastními slovy…"
              disabled={pending || Boolean(grade)}
            />
            {!grade ? (
              <Button
                type="button"
                disabled={pending || !answer.trim()}
                onClick={onSubmit}
              >
                Zkontrolovat podle zdroje
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    tone={
                      grade.result === "correct"
                        ? "success"
                        : grade.result === "partial"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {grade.result === "correct"
                      ? "Sedí ke zdroji"
                      : grade.result === "partial"
                        ? "Částečně"
                        : grade.result === "insufficient"
                          ? "Nedostatek podkladů"
                          : "Nesedí"}
                  </Badge>
                  <ConfidenceBadge confidence={grade.confidence} />
                </div>
                {grade.showInsufficientMessage ? (
                  <p className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-body-sm font-medium text-fg">
                    {INSUFFICIENT_EVIDENCE_CS}
                  </p>
                ) : null}
                <p className="text-body-sm text-fg-secondary">{grade.feedback}</p>
                {grade.openEvaluation ? (
                  <div className="space-y-2 rounded-lg border border-border bg-subtle/30 p-3 text-body-sm">
                    {grade.openEvaluation.whatWasCorrect.length > 0 ? (
                      <p>
                        <span className="font-semibold text-success">
                          Správně:{" "}
                        </span>
                        {grade.openEvaluation.whatWasCorrect.join(", ")}
                      </p>
                    ) : null}
                    {grade.openEvaluation.whatWasMissing.length > 0 ? (
                      <p>
                        <span className="font-semibold text-warning">
                          Chybí:{" "}
                        </span>
                        {grade.openEvaluation.whatWasMissing.join(", ")}
                      </p>
                    ) : null}
                    {grade.openEvaluation.whatWasWrong.length > 0 ? (
                      <p>
                        <span className="font-semibold text-danger">
                          Špatně:{" "}
                        </span>
                        {grade.openEvaluation.whatWasWrong.join("; ")}
                      </p>
                    ) : null}
                    <p>
                      <span className="font-semibold">Ideální odpověď: </span>
                      {grade.openEvaluation.idealAnswer}
                    </p>
                  </div>
                ) : null}
                <div className="rounded-lg border border-border bg-subtle/30 p-3">
                  <p className="text-caption font-semibold text-fg-muted">
                    Odpověď ze zdroje
                  </p>
                  <p className="mt-1 text-body-sm text-fg whitespace-pre-wrap">
                    {item.groundedAnswer}
                  </p>
                </div>
                <SourceCitationPanel
                  citations={grade.citations}
                  confidence={grade.confidence}
                />
                <Button type="button" onClick={onNext}>
                  Další
                </Button>
              </div>
            )}
            {!grade ? (
              <SourceCitationPanel
                citations={item.citations}
                confidence={item.confidence}
              />
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-title-sm">Zeptej se materiálů</CardTitle>
          <CardDescription>
            Vysvětlení jen z vybraných souborů. Když podklad chybí, řekneme to
            na rovinu.
          </CardDescription>
        </CardHeader>
        <div className="space-y-3 px-6 pb-6">
          <input
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-body-md"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Např. Co říká materiál o Máji?"
            disabled={pending}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={pending || !query.trim()}
            onClick={onAsk}
          >
            Vysvětlit ze zdroje
          </Button>
          {explanation ? (
            <div className="space-y-3">
              <ConfidenceBadge confidence={explanation.confidence} />
              {explanation.insufficient ? (
                <p className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-body-sm font-medium">
                  {INSUFFICIENT_EVIDENCE_CS}
                </p>
              ) : (
                <p className="whitespace-pre-wrap text-body-sm text-fg">
                  {explanation.text}
                </p>
              )}
              <SourceCitationPanel
                citations={explanation.citations}
                confidence={explanation.confidence}
              />
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
