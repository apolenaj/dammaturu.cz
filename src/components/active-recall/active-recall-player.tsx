"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  resetRecallProgressAction,
  submitRecallAnswerAction,
} from "@/server/actions/active-recall";
import {
  averageCoverage,
  recallResultLabelsCs,
  type RecallGrade,
  type RecallPack,
  type RecallProgress,
} from "@/domain/learning/active-recall";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  results: {
    length: number;
    [index: number]:
      | {
          length: number;
          [index: number]: { transcript: string } | undefined;
        }
      | undefined;
  };
};

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function ActiveRecallPlayer({
  pack,
  initialProgress,
  learnerId,
}: {
  pack: RecallPack;
  initialProgress: RecallProgress | null;
  learnerId: string | null;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [index, setIndex] = useState(() =>
    Math.min(
      initialProgress?.completedPromptIds.length ?? 0,
      pack.prompts.length,
    ),
  );
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<RecallGrade | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "speech">("text");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const prompt = pack.prompts[index] ?? null;
  const done = index >= pack.prompts.length;
  const avg = progress ? averageCoverage(progress) : null;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  function startListening() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Toto zařízení nepodporuje speech input.");
      return;
    }
    setError(null);
    const rec = new Ctor();
    rec.lang = "cs-CZ";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result?.[0]?.transcript ?? "";
      if (transcript) {
        setAnswer((prev) => {
          const base = prev.trim();
          return base ? `${base} ${transcript.trim()}` : transcript.trim();
        });
        setInputMode("speech");
      }
    };
    rec.onerror = (event) => {
      setListening(false);
      if (event.error !== "aborted") {
        setError(`Mikrofon: ${event.error}`);
      }
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  function submit() {
    if (!prompt) return;
    if (!learnerId) {
      setError("Pro uložení výsledků dokonči onboarding.");
      return;
    }
    if (answer.trim().length < 3) {
      setError("Napiš nebo namluv odpověď.");
      return;
    }
    stopListening();
    setError(null);
    startTransition(async () => {
      const res = await submitRecallAnswerAction({
        packSlug: pack.slug,
        promptId: prompt.id,
        answer,
        inputMode,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setProgress(res.progress);
      setGrade(res.grade);
    });
  }

  function next() {
    setGrade(null);
    setAnswer("");
    setInputMode("text");
    setIndex((i) => i + 1);
  }

  function restart() {
    if (!learnerId) return;
    startTransition(async () => {
      const res = await resetRecallProgressAction({ packSlug: pack.slug });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setProgress(res.progress);
      setIndex(0);
      setGrade(null);
      setAnswer("");
    });
  }

  const kuWeak = useMemo(() => {
    if (!progress) return [];
    return [...progress.kuStats]
      .filter((s) => s.misses > s.hits)
      .sort((a, b) => b.misses - a.misses)
      .slice(0, 5);
  }, [progress]);

  if (done) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-1 pb-[env(safe-area-inset-bottom)]">
        <Badge tone="success">Hotovo</Badge>
        <h1 className="font-display text-display-md text-fg">Shrnutí vybavování</h1>
        <p className="text-body-sm text-fg-secondary">{pack.title}</p>
        {progress ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Kompletní" value={progress.correctCount} />
            <Stat label="Částečné" value={progress.partialCount} />
            <Stat label="Bez zásahu" value={progress.incorrectCount} />
            <Stat label="Průměr pokrytí" value={avg !== null ? `${avg}%` : "—"} />
          </div>
        ) : null}
        {kuWeak.length > 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="text-body-sm font-semibold text-fg">
              Knowledge units k posílení
            </h2>
            <ul className="mt-2 space-y-1 text-body-sm text-fg-secondary">
              {kuWeak.map((k) => (
                <li key={k.knowledgeUnitId}>
                  {k.title} — zásahy {k.hits}, mezery {k.misses}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Button onClick={restart} disabled={pending || !learnerId}>
          Spustit znovu
        </Button>
      </div>
    );
  }

  if (!prompt) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
      <header className="space-y-2 px-1">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">Aktivní vybavování</Badge>
          <Badge tone="accent">
            {index + 1}/{pack.prompts.length}
          </Badge>
        </div>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-sm text-fg-secondary">{pack.summary}</p>
        {progress && progress.attemptCount > 0 ? (
          <p className="text-caption text-fg-muted">
            Pokrytí avg {avg ?? 0}% · částečné {progress.partialCount} · KU{" "}
            {progress.kuStats.length}
          </p>
        ) : null}
      </header>

      {error ? (
        <Alert title="Pozor" tone="warning">
          {error}
        </Alert>
      ) : null}

      {!grade ? (
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <p className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
            Bez nabídek — vybav si sám/a
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-fg sm:text-2xl">
            {prompt.prompt}
          </h2>
          <p className="mt-2 text-body-sm text-fg-secondary">
            Cíl: aspoň {prompt.minExpected} klíčových bodů (mapováno na knowledge
            units).
          </p>

          <label className="mt-5 block">
            <span className="sr-only">Tvoje odpověď</span>
            <textarea
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                setInputMode("text");
              }}
              rows={6}
              placeholder="Piš vlastními slovy…"
              className="w-full rounded-xl border border-border bg-subtle/40 px-3 py-3 text-base text-fg placeholder:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </label>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {speechSupported ? (
              <Button
                type="button"
                className="min-h-11"
                variant={listening ? "danger" : "secondary"}
                onClick={() => (listening ? stopListening() : startListening())}
              >
                {listening ? "Zastavit mikrofon" : "Říct nahlas"}
              </Button>
            ) : (
              <p className="text-caption text-fg-muted">
                Hlas na tomto zařízení nejde — piš text (funguje všude).
              </p>
            )}
            {inputMode === "speech" ? (
              <Badge tone="info">vstup: řeč</Badge>
            ) : null}
          </div>

          <div className="sticky-study-cta mt-4">
            <Button
              fullWidth
              size="lg"
              className="min-h-12"
              onClick={submit}
              disabled={pending}
            >
              Odeslat a vyhodnotit
            </Button>
          </div>
        </section>
      ) : (
        <GradePanel grade={grade} onNext={next} pending={pending} />
      )}
    </div>
  );
}

function GradePanel({
  grade,
  onNext,
  pending,
}: {
  grade: RecallGrade;
  onNext: () => void;
  pending: boolean;
}) {
  const tone =
    grade.result === "correct"
      ? "success"
      : grade.result === "partial"
        ? "warning"
        : "danger";

  return (
    <section className="space-y-4">
      <Alert title={recallResultLabelsCs[grade.result]} tone={tone}>
        Pokrytí key points: {Math.round(grade.coverage * 100)}% · vůči cíli:{" "}
        {Math.round(grade.expectedCoverage * 100)}%. Ne binární skóre — vidíš
        zásahy i mezery.
      </Alert>

      <FeedbackBlock
        title="Uvedl/a jsi správně"
        empty="Nic z klíčových bodů se nenašlo."
        items={grade.matched.map((m) => ({
          key: m.keyPointId,
          primary: m.label,
          secondary: m.knowledgeUnitTitle,
        }))}
        tone="success"
      />

      <FeedbackBlock
        title="Chybělo"
        empty="Nic nechybělo."
        items={grade.missing.map((m) => ({
          key: m.keyPointId,
          primary: m.label,
          secondary: m.knowledgeUnitTitle,
        }))}
        tone="warning"
      />

      <FeedbackBlock
        title="Navíc / nezařazeno"
        empty="Žádné výrazné navíc fragmenty."
        items={grade.extra.map((e, i) => ({
          key: `extra-${i}`,
          primary: e,
          secondary: "neodpovídá key pointu",
        }))}
        tone="neutral"
      />

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="text-body-sm font-semibold text-fg">
          Modelová stručná odpověď
        </h3>
        <p className="mt-2 text-body-md text-fg">{grade.modelAnswer}</p>
      </div>

      <div className="rounded-2xl border border-border bg-subtle/40 p-4">
        <h3 className="text-body-sm font-semibold text-fg">Knowledge units</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {grade.perKnowledgeUnit.map((ku) => (
            <li
              key={ku.knowledgeUnitId}
              className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-surface px-3 ring-1 ring-border"
            >
              <span className="text-body-sm text-fg">{ku.title}</span>
              <Badge tone={ku.status === "hit" ? "success" : "warning"}>
                {ku.status === "hit" ? "zásah" : "mezera"}
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      <Button fullWidth size="lg" onClick={onNext} disabled={pending}>
        Další otázka
      </Button>
    </section>
  );
}

function FeedbackBlock({
  title,
  empty,
  items,
  tone,
}: {
  title: string;
  empty: string;
  items: Array<{ key: string; primary: string; secondary: string }>;
  tone: "success" | "warning" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "success" && "border-success/30 bg-success-soft/40",
        tone === "warning" && "border-warning/30 bg-warning-soft/40",
        tone === "neutral" && "border-border bg-surface",
      )}
    >
      <h3 className="text-body-sm font-semibold text-fg">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-body-sm text-fg-secondary">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.key}>
              <p className="text-body-sm font-medium text-fg">{item.primary}</p>
              <p className="text-caption text-fg-muted">{item.secondary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
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
