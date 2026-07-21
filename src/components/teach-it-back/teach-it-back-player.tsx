"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  resetTeachProgressAction,
  submitTeachAnswerAction,
} from "@/server/actions/teach-it-back";
import {
  averageTeachCoverage,
  teachResultLabelsCs,
  type TeachGrade,
  type TeachPack,
  type TeachProgress,
} from "@/domain/learning/teach-it-back";
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

export function TeachItBackPlayer({
  pack,
  initialProgress,
  learnerId,
}: {
  pack: TeachPack;
  initialProgress: TeachProgress | null;
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
  const [grade, setGrade] = useState<TeachGrade | null>(null);
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
  const avg = progress ? averageTeachCoverage(progress) : null;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  function startListening() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Toto zařízení nepodporuje hlasový vstup.");
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
    rec.onerror = () => {
      setListening(false);
      setError("Mikrofon selhal — zkus text.");
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setInputMode("speech");
  }

  function submit() {
    if (!prompt || !learnerId) {
      setError("Pro vyhodnocení dokonči onboarding.");
      return;
    }
    setError(null);
    stopListening();
    startTransition(async () => {
      const res = await submitTeachAnswerAction({
        packSlug: pack.slug,
        promptId: prompt.id,
        answer,
        inputMode,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setGrade(res.grade);
      setProgress(res.progress);
    });
  }

  function next() {
    setGrade(null);
    setAnswer("");
    setInputMode("text");
    setIndex((i) => i + 1);
  }

  function reset() {
    if (!learnerId) return;
    startTransition(async () => {
      const res = await resetTeachProgressAction({ packSlug: pack.slug });
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

  if (done) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <Badge tone="success">Hotovo</Badge>
        <h1 className="font-display text-display-md text-fg">
          Teach It Back — shrnutí
        </h1>
        {progress ? (
          <p className="text-body-md text-fg-secondary">
            {progress.strongCount} silných · {progress.partialCount} částečných ·{" "}
            {progress.weakCount} slabých
            {avg != null ? ` · avg checklist ${avg} %` : null}
          </p>
        ) : null}
        <Button fullWidth onClick={reset} disabled={pending || !learnerId}>
          Spustit znovu
        </Button>
      </div>
    );
  }

  if (!prompt) return null;

  if (grade) {
    return (
      <TeachFeedback
        grade={grade}
        onNext={next}
        pending={pending}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">Teach It Back</Badge>
          <span className="text-caption text-fg-muted">
            {index + 1} / {pack.prompts.length}
          </span>
        </div>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-sm text-fg-secondary">
          Vysvětli vlastními slovy. Hodnotíme checklist knowledge units — ne délku
          textu.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-canvas px-4 py-5">
        <p className="font-display text-xl text-fg">{prompt.prompt}</p>
        <p className="mt-3 text-caption text-fg-muted">
          Checklist: {prompt.checklist.filter((c) => c.required).length} povinných
          KU · {prompt.checklist.length} celkem
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone={inputMode === "text" ? "brand" : "neutral"}>Text</Badge>
        <Badge tone={inputMode === "speech" ? "brand" : "neutral"}>Hlas</Badge>
      </div>

      <label className="block space-y-1">
        <span className="sr-only">Vysvětlení vlastními slovy</span>
        <textarea
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            setInputMode("text");
          }}
          rows={6}
          placeholder="Piš vlastními slovy… nebo použij mikrofon."
          className="w-full rounded-xl border border-border bg-subtle px-3 py-3 text-body-md"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {speechSupported ? (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={listening ? stopListening : startListening}
          >
            {listening ? "Zastavit mikrofon" : "Říct nahlas"}
          </Button>
        ) : (
          <p className="text-caption text-fg-muted">
            Hlasový vstup na tomto zařízení není k dispozici.
          </p>
        )}
      </div>

      {error ? (
        <Alert title="Chyba" tone="danger">
          {error}
        </Alert>
      ) : null}

      {!learnerId ? (
        <Alert title="Onboarding" tone="info">
          Pro uložení výsledků dokonči onboarding.
        </Alert>
      ) : null}

      <Button
        fullWidth
        size="lg"
        disabled={pending || !learnerId || answer.trim().length < 8}
        onClick={submit}
      >
        Odeslat a vyhodnotit
      </Button>
    </div>
  );
}

function TeachFeedback({
  grade,
  onNext,
  pending,
}: {
  grade: TeachGrade;
  onNext: () => void;
  pending: boolean;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          tone={
            grade.result === "strong"
              ? "success"
              : grade.result === "partial"
                ? "warning"
                : "danger"
          }
        >
          {teachResultLabelsCs[grade.result]}
        </Badge>
        <span className="text-caption text-fg-muted">
          checklist {Math.round(grade.checklistCoverage * 100)} % ·{" "}
          {grade.wordCount} slov
        </span>
      </div>

      <Alert
        title="Hodnocení"
        tone={grade.lengthWithoutSubstance ? "warning" : "info"}
      >
        {grade.coachingNoteCs}
      </Alert>

      <FeedbackBlock
        title="Co jsi vysvětlil/a dobře"
        empty="Zatím žádný zásah checklistu."
        items={grade.explainedWell.map((m) => ({
          key: m.checklistId,
          primary: m.label,
          secondary: m.knowledgeUnitTitle,
        }))}
        tone="success"
      />

      <FeedbackBlock
        title="Co chybí"
        empty="Nic podstatného nechybělo."
        items={grade.missing.map((m) => ({
          key: m.checklistId,
          primary: m.label,
          secondary: `${m.knowledgeUnitTitle}${m.required ? " · povinné" : ""}`,
        }))}
        tone="warning"
      />

      <FeedbackBlock
        title="Co je nepřesné"
        empty="Žádné detekované nepřesnosti."
        items={grade.inaccurate.map((m) => ({
          key: m.inaccuracyId,
          primary: m.label,
          secondary: m.correction,
        }))}
        tone="danger"
      />

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h3 className="text-body-sm font-semibold text-fg">
          Jak by vypadala výborná odpověď
        </h3>
        <p className="mt-2 text-body-md text-fg">{grade.excellentAnswer}</p>
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
        Další výzva
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
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "success" && "border-success/30 bg-success-soft/40",
        tone === "warning" && "border-warning/30 bg-warning-soft/40",
        tone === "danger" && "border-danger/30 bg-danger-soft/40",
        tone === "neutral" && "border-border bg-surface",
      )}
    >
      <h3 className="text-body-sm font-semibold text-fg">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-body-sm text-fg-secondary">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.key} className="text-body-sm">
              <span className="font-semibold text-fg">{item.primary}</span>
              <span className="mt-0.5 block text-caption text-fg-muted">
                {item.secondary}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
