"use client";

import { useMemo, useState, useTransition } from "react";
import {
  resetQuestionProgressAction,
  submitQuestionAttemptAction,
} from "@/server/actions/question-engine";
import {
  averageScore,
  questionKindLabelsCs,
  type EngineQuestion,
  type GradeFeedback,
  type QuestionPack,
  type QuestionProgress,
  type StudentAnswer,
} from "@/domain/learning/question-engine";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudyPhaseFrame } from "@/components/ui/study-phase";
import {
  StudyHelpedPrompt,
  markMeaningfulStudyLocal,
} from "@/components/feedback/study-helped-prompt";
import { cn } from "@/lib/cn";
import {
  noteGuestMistake,
  noteGuestQuestionCompleted,
} from "@/lib/guest-progress-cache";

function looksLikeGuestId(id: string): boolean {
  return /^g[a-f0-9]{32}$/.test(id);
}

export function QuestionEnginePlayer({
  pack,
  initialProgress,
  learnerId,
  asDiagnostic = false,
  experimentAssessmentId = null,
  experimentQuestionIds = null,
}: {
  pack: QuestionPack;
  initialProgress: QuestionProgress | null;
  learnerId: string | null;
  asDiagnostic?: boolean;
  /** N=1 weekly/final — filtered question set. */
  experimentAssessmentId?: string | null;
  experimentQuestionIds?: string[] | null;
}) {
  const questions = useMemo(() => {
    if (!experimentQuestionIds || experimentQuestionIds.length === 0) {
      return pack.questions;
    }
    const byId = new Map(pack.questions.map((q) => [q.id, q]));
    return experimentQuestionIds
      .map((id) => byId.get(id))
      .filter((q): q is EngineQuestion => Boolean(q));
  }, [pack.questions, experimentQuestionIds]);

  const [progress, setProgress] = useState(initialProgress);
  const [index, setIndex] = useState(() => {
    if (experimentQuestionIds?.length) return 0;
    return Math.min(
      initialProgress?.completedQuestionIds.length ?? 0,
      pack.questions.length,
    );
  });
  const [grade, setGrade] = useState<GradeFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticDone, setDiagnosticDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const question = questions[index] ?? null;
  const done = index >= questions.length;
  const avg = progress ? averageScore(progress) : null;

  function submit(answer: StudentAnswer) {
    if (!question) return;
    if (!learnerId) {
      setError("Chvíli počkej — připravujeme studijní session…");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitQuestionAttemptAction({
        packSlug: pack.slug,
        questionId: question.id,
        answer,
        asDiagnostic,
        experimentAssessmentId: experimentAssessmentId ?? undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setProgress(res.progress);
      setGrade(res.grade);
      if (res.diagnosticCompleted) setDiagnosticDone(true);
      if (looksLikeGuestId(learnerId)) {
        noteGuestQuestionCompleted({
          guestId: learnerId,
          questionId: question.id,
          packSlug: pack.slug,
        });
        if (
          res.grade.result === "incorrect" ||
          res.grade.result === "partial"
        ) {
          noteGuestMistake(learnerId);
        }
      }
    });
  }

  function next() {
    setGrade(null);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex >= questions.length) {
      markMeaningfulStudyLocal();
    }
  }

  function restart() {
    if (!learnerId) return;
    startTransition(async () => {
      const res = await resetQuestionProgressAction({ packSlug: pack.slug });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setProgress(res.progress);
      setIndex(0);
      setGrade(null);
    });
  }

  if (done) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-1 pb-[env(safe-area-inset-bottom)]">
        <Badge tone="success">Session hotová</Badge>
        {asDiagnostic || diagnosticDone ? (
          <Alert title="Diagnostika" tone="info">
            {diagnosticDone
              ? "Baseline uložen — plán se teď může přizpůsobit. Pokračuj na Plán nebo Dnes."
              : "Odpověz aspoň na 8 otázek v diagnostickém režimu, aby se uložil baseline."}
            <div className="mt-3 flex flex-wrap gap-3">
              <a href="/app/plan" className="font-semibold text-info underline">
                Automatický plán
              </a>
              <a
                href="/app/dashboard"
                className="font-semibold text-info underline"
              >
                Dnešní mise
              </a>
            </div>
          </Alert>
        ) : null}
        <h1 className="font-display text-display-md text-fg">Shrnutí</h1>
        {progress ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Správně" value={progress.correctCount} />
            <Stat label="Částečně" value={progress.partialCount} />
            <Stat label="Vedle" value={progress.incorrectCount} />
            <Stat label="Avg skóre" value={avg !== null ? `${avg}%` : "—"} />
          </div>
        ) : null}
        <Button onClick={restart} disabled={pending || !learnerId}>
          Spustit znovu
        </Button>
        <StudyHelpedPrompt context={`question_pack:${pack.slug}`} />
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
      <header className="space-y-2 px-1">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">
            {asDiagnostic ? "Vstupní diagnostika" : "Question Engine"}
          </Badge>
          <Badge tone="accent">
            {index + 1}/{pack.questions.length}
          </Badge>
          <Badge tone="neutral">{questionKindLabelsCs[question.kind]}</Badge>
        </div>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-sm text-fg-secondary">{pack.summary}</p>
        <p className="text-caption text-fg-muted">
          Obtížnost {question.difficulty}/5 · relevance {question.examRelevance}{" "}
          · zdroj: {question.source}
        </p>
      </header>

      {error ? (
        <Alert title="Pozor" tone="warning">
          {error}
        </Alert>
      ) : null}

      {!grade ? (
        <QuestionPrompt
          question={question}
          pending={pending}
          onSubmit={submit}
        />
      ) : (
        <ExplanationPanel grade={grade} onNext={next} pending={pending} />
      )}
    </div>
  );
}

function QuestionPrompt({
  question,
  pending,
  onSubmit,
}: {
  question: EngineQuestion;
  pending: boolean;
  onSubmit: (a: StudentAnswer) => void;
}) {
  return (
    <div className="space-y-4">
      <StudyPhaseFrame phase="question">
        <h2 className="font-display text-xl font-semibold text-fg sm:text-2xl">
          {question.stem}
        </h2>
        {question.kind === "identify_from_clues" ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-body-sm text-fg-secondary">
            {question.clues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ) : null}
        {question.kind === "error_spotting" ? (
          <p className="mt-3 rounded-lg bg-subtle/60 px-3 py-2 text-body-sm text-fg-secondary">
            {question.passage}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-1">
          {question.knowledgeUnits.map((ku) => (
            <Badge key={ku.id} tone="info">
              {ku.title}
            </Badge>
          ))}
        </div>
      </StudyPhaseFrame>
      <StudyPhaseFrame phase="answer">
        <AnswerControls
          question={question}
          pending={pending}
          onSubmit={onSubmit}
        />
      </StudyPhaseFrame>
    </div>
  );
}

function AnswerControls({
  question,
  pending,
  onSubmit,
}: {
  question: EngineQuestion;
  pending: boolean;
  onSubmit: (a: StudentAnswer) => void;
}) {
  switch (question.kind) {
    case "single_choice":
    case "identify_from_clues":
    case "error_spotting":
      return (
        <ChoiceList
          options={question.options}
          multi={false}
          pending={pending}
          onSubmit={(ids) => {
            if (question.kind === "single_choice") {
              onSubmit({ kind: "single_choice", optionId: ids[0]! });
            } else if (question.kind === "identify_from_clues") {
              onSubmit({ kind: "identify_from_clues", optionId: ids[0]! });
            } else {
              onSubmit({ kind: "error_spotting", optionId: ids[0]! });
            }
          }}
        />
      );
    case "multiple_choice":
      return (
        <ChoiceList
          options={question.options}
          multi
          pending={pending}
          onSubmit={(ids) =>
            onSubmit({ kind: "multiple_choice", optionIds: ids })
          }
        />
      );
    case "true_false":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={pending}
            onClick={() => onSubmit({ kind: "true_false", value: true })}
          >
            Pravda
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => onSubmit({ kind: "true_false", value: false })}
          >
            Nepravda
          </Button>
        </div>
      );
    case "short_answer":
    case "long_answer":
      return (
        <TextAnswer
          long={question.kind === "long_answer"}
          pending={pending}
          onSubmit={(text) =>
            onSubmit(
              question.kind === "short_answer"
                ? { kind: "short_answer", text }
                : { kind: "long_answer", text },
            )
          }
        />
      );
    case "fill_blank":
      return (
        <FillBlank
          template={question.template}
          blankCount={question.correctAnswer.length}
          pending={pending}
          onSubmit={(blanks) => onSubmit({ kind: "fill_blank", blanks })}
        />
      );
    case "matching":
      return (
        <Pairing
          left={question.left}
          right={question.right}
          pending={pending}
          onSubmit={(pairs) => onSubmit({ kind: "matching", pairs })}
        />
      );
    case "author_work_pairing":
      return (
        <Pairing
          left={question.authors}
          right={question.works}
          pending={pending}
          onSubmit={(pairs) =>
            onSubmit({ kind: "author_work_pairing", pairs })
          }
        />
      );
    case "character_work_pairing":
      return (
        <Pairing
          left={question.characters}
          right={question.works}
          pending={pending}
          onSubmit={(pairs) =>
            onSubmit({ kind: "character_work_pairing", pairs })
          }
        />
      );
    case "ordering":
    case "timeline_ordering":
      return (
        <OrderList
          items={question.items}
          pending={pending}
          onSubmit={(order) =>
            onSubmit(
              question.kind === "ordering"
                ? { kind: "ordering", order }
                : { kind: "timeline_ordering", order },
            )
          }
        />
      );
    case "categorization":
      return (
        <Categorize
          categories={question.categories}
          items={question.items}
          pending={pending}
          onSubmit={(assignments) =>
            onSubmit({ kind: "categorization", assignments })
          }
        />
      );
    default:
      return null;
  }
}

function ChoiceList({
  options,
  multi,
  pending,
  onSubmit,
}: {
  options: Array<{ id: string; label: string }>;
  multi: boolean;
  pending: boolean;
  onSubmit: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  function toggle(id: string) {
    setSelected((prev) => {
      if (multi) {
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      }
      return [id];
    });
  }
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => toggle(o.id)}
          className={cn(
            "flex min-h-12 w-full touch-manipulation items-center rounded-xl px-3 text-left text-body-sm font-medium ring-1 transition",
            selected.includes(o.id)
              ? "bg-action/10 ring-action"
              : "bg-subtle ring-border",
          )}
        >
          {o.label}
        </button>
      ))}
      <Button
        className="mt-3"
        fullWidth
        disabled={pending || selected.length === 0}
        onClick={() => onSubmit(selected)}
      >
        Odeslat
      </Button>
    </div>
  );
}

function TextAnswer({
  long,
  pending,
  onSubmit,
}: {
  long: boolean;
  pending: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={long ? 7 : 3}
        className="w-full rounded-xl border border-border bg-subtle/40 px-3 py-3 text-body-md text-fg"
        placeholder="Napiš odpověď…"
      />
      <Button
        fullWidth
        disabled={pending || text.trim().length < 2}
        onClick={() => onSubmit(text)}
      >
        Odeslat
      </Button>
    </div>
  );
}

function FillBlank({
  template,
  blankCount,
  pending,
  onSubmit,
}: {
  template: string;
  blankCount: number;
  pending: boolean;
  onSubmit: (blanks: string[]) => void;
}) {
  const [blanks, setBlanks] = useState<string[]>(() =>
    Array.from({ length: blankCount }, () => ""),
  );
  const parts = template.split("___");
  return (
    <div className="space-y-3">
      <p className="text-body-md text-fg">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < blankCount ? (
              <input
                value={blanks[i] ?? ""}
                onChange={(e) => {
                  const next = [...blanks];
                  next[i] = e.target.value;
                  setBlanks(next);
                }}
                className="mx-1 inline-block w-28 rounded-md border border-border bg-subtle px-2 py-1 text-body-sm"
                aria-label={`Blank ${i + 1}`}
              />
            ) : null}
          </span>
        ))}
      </p>
      <Button
        fullWidth
        disabled={pending || blanks.some((b) => !b.trim())}
        onClick={() => onSubmit(blanks)}
      >
        Odeslat
      </Button>
    </div>
  );
}

function Pairing({
  left,
  right,
  pending,
  onSubmit,
}: {
  left: Array<{ id: string; label: string }>;
  right: Array<{ id: string; label: string }>;
  pending: boolean;
  onSubmit: (pairs: Record<string, string>) => void;
}) {
  const [pairs, setPairs] = useState<Record<string, string>>({});
  return (
    <div className="space-y-3">
      {left.map((l) => (
        <label key={l.id} className="block space-y-1">
          <span className="text-body-sm font-medium text-fg">{l.label}</span>
          <select
            className="w-full rounded-xl border border-border bg-subtle px-3 py-3 text-body-sm"
            value={pairs[l.id] ?? ""}
            onChange={(e) =>
              setPairs((prev) => ({ ...prev, [l.id]: e.target.value }))
            }
          >
            <option value="">— vyber —</option>
            {right.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <Button
        fullWidth
        disabled={pending || left.some((l) => !pairs[l.id])}
        onClick={() => onSubmit(pairs)}
      >
        Odeslat
      </Button>
    </div>
  );
}

function OrderList({
  items,
  pending,
  onSubmit,
}: {
  items: Array<{ id: string; label: string; yearHint?: number }>;
  pending: boolean;
  onSubmit: (order: string[]) => void;
}) {
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  const byId = useMemo(
    () => new Map(items.map((i) => [i.id, i])),
    [items],
  );
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setOrder(next);
  }
  return (
    <div className="space-y-2">
      {order.map((id, i) => {
        const item = byId.get(id)!;
        return (
          <div
            key={id}
            className="flex min-h-12 items-center gap-2 rounded-xl bg-subtle px-2 ring-1 ring-border"
          >
            <span className="flex-1 text-body-sm font-medium text-fg">
              {item.label}
              {item.yearHint ? (
                <span className="text-fg-muted"> ({item.yearHint})</span>
              ) : null}
            </span>
            <button
              type="button"
              className="min-h-11 min-w-11 rounded-md border border-border bg-surface"
              onClick={() => move(i, -1)}
              aria-label="Nahoru"
            >
              ↑
            </button>
            <button
              type="button"
              className="min-h-11 min-w-11 rounded-md border border-border bg-surface"
              onClick={() => move(i, 1)}
              aria-label="Dolů"
            >
              ↓
            </button>
          </div>
        );
      })}
      <Button
        className="mt-2"
        fullWidth
        disabled={pending}
        onClick={() => onSubmit(order)}
      >
        Odeslat pořadí
      </Button>
    </div>
  );
}

function Categorize({
  categories,
  items,
  pending,
  onSubmit,
}: {
  categories: Array<{ id: string; label: string }>;
  items: Array<{ id: string; label: string }>;
  pending: boolean;
  onSubmit: (assignments: Record<string, string>) => void;
}) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <label key={item.id} className="block space-y-1">
          <span className="text-body-sm font-medium text-fg">{item.label}</span>
          <select
            className="w-full rounded-xl border border-border bg-subtle px-3 py-3 text-body-sm"
            value={assignments[item.id] ?? ""}
            onChange={(e) =>
              setAssignments((prev) => ({
                ...prev,
                [item.id]: e.target.value,
              }))
            }
          >
            <option value="">— kategorie —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <Button
        fullWidth
        disabled={pending || items.some((i) => !assignments[i.id])}
        onClick={() => onSubmit(assignments)}
      >
        Odeslat
      </Button>
    </div>
  );
}

function ExplanationPanel({
  grade,
  onNext,
  pending,
}: {
  grade: GradeFeedback;
  onNext: () => void;
  pending: boolean;
}) {
  const tone =
    grade.result === "correct"
      ? "success"
      : grade.result === "partial"
        ? "warning"
        : "danger";
  const open = grade.openEvaluation;

  return (
    <section className="space-y-4">
      <StudyPhaseFrame phase="feedback">
        <Alert title={grade.headline} tone={tone}>
          Skóre {Math.round(grade.score * 100)}% ·{" "}
          {open ? open.resultLabel : grade.result}. Nejen barva — níže je rozbor.
        </Alert>
      </StudyPhaseFrame>

      <StudyPhaseFrame phase="explanation">
        <p className="text-body-md text-fg">{grade.explanation}</p>
      </StudyPhaseFrame>

      {open ? (
        <div className="space-y-3 rounded-2xl border border-border bg-subtle/40 p-4">
          <h3 className="text-body-sm font-semibold text-fg">
            Hodnocení otevřené odpovědi
          </h3>
          <p className="text-caption text-fg-muted">
            Nehodnotíme přesné znění — jen klíčové myšlenky a fakta.
          </p>
          {open.whatWasCorrect.length > 0 ? (
            <div>
              <p className="text-caption font-semibold text-success">
                Co bylo správně
              </p>
              <ul className="mt-1 space-y-1 text-body-sm text-fg-secondary">
                {open.whatWasCorrect.map((c) => (
                  <li key={`ok-${c}`}>✓ {c}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {open.whatWasMissing.length > 0 ? (
            <div>
              <p className="text-caption font-semibold text-warning">
                Co chybělo
              </p>
              <ul className="mt-1 space-y-1 text-body-sm text-fg-secondary">
                {open.whatWasMissing.map((m) => (
                  <li key={`miss-${m}`}>○ {m}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {open.whatWasWrong.length > 0 ? (
            <div>
              <p className="text-caption font-semibold text-danger">
                Co bylo špatně
              </p>
              <ul className="mt-1 space-y-1 text-body-sm text-fg-secondary">
                {open.whatWasWrong.map((w) => (
                  <li key={`bad-${w}`}>✗ {w}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <p className="text-caption font-semibold text-fg">
              Ideální stručná odpověď
            </p>
            <p className="mt-1 text-body-sm text-fg whitespace-pre-wrap">
              {open.idealAnswer}
            </p>
          </div>
          {open.sourceEvidence ? (
            <StudyPhaseFrame phase="source" className="mt-3">
              <p className="text-caption text-fg-muted">
                {open.sourceEvidence.sourceLabel}
                {open.sourceEvidence.pageStart != null
                  ? ` · str. ${open.sourceEvidence.pageStart}`
                  : ""}
              </p>
              <blockquote className="mt-1 border-l-2 border-action pl-3 text-body-sm text-fg-secondary">
                {open.sourceEvidence.quote}
              </blockquote>
            </StudyPhaseFrame>
          ) : null}
        </div>
      ) : (
        <StudyPhaseFrame phase="explanation">
          <p className="text-body-sm font-semibold text-fg">Rozbor</p>
          <ul className="mt-2 space-y-1 text-body-sm text-fg-secondary">
            {grade.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          {grade.expectedSummary ? (
            <p className="mt-3 text-body-sm text-fg">
              <span className="font-semibold">Očekáváno: </span>
              {grade.expectedSummary}
            </p>
          ) : null}
        </StudyPhaseFrame>
      )}

      <StudyPhaseFrame phase="feedback" showLabel={false}>
        <p className="text-body-sm font-semibold text-fg">Studijní jednotky</p>
        <ul className="mt-2 space-y-2">
          {grade.knowledgeUnits.map((ku) => (
            <li
              key={ku.id}
              className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-subtle px-3"
            >
              <span className="text-body-sm text-fg">{ku.title}</span>
              <Badge tone={ku.credited ? "success" : "warning"}>
                {ku.credited ? "započteno" : "mezera"}
              </Badge>
            </li>
          ))}
        </ul>
      </StudyPhaseFrame>

      <StudyPhaseFrame phase="next" showLabel={false}>
        <Button fullWidth size="lg" onClick={onNext} disabled={pending}>
          Další otázka
        </Button>
      </StudyPhaseFrame>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-subtle px-3 py-4 text-center">
      <p className="font-display text-2xl font-semibold text-fg">{value}</p>
      <p className="text-caption text-fg-muted">{label}</p>
    </div>
  );
}
