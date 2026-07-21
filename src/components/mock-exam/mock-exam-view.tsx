"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  gradeMockExam,
  mockExamBandLabelsCs,
  mockExamDimensionLabelsCs,
  mockExamDimensions,
  mockExamPhaseLabelsCs,
  mockExamRubric,
  pickRandomTopic,
  selectFollowUps,
  type MockExamFollowUp,
  type MockExamPack,
  type MockExamPhase,
  type MockExamReport,
  type MockExamTopic,
} from "@/domain/learning/mock-exam";
import { recordMockExamProgressAction } from "@/server/actions/progress-gamification";
import type { LearningCelebration } from "@/domain/learning/progress-gamification";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LearningCelebrationQueue } from "@/components/progress/learning-celebration-queue";
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

export function MockExamView({ pack }: { pack: MockExamPack }) {
  const [phase, setPhase] = useState<MockExamPhase>("select");
  const [topic, setTopic] = useState<MockExamTopic | null>(null);
  const [prepareLeft, setPrepareLeft] = useState(0);
  const [answerLeft, setAnswerLeft] = useState(0);
  const [prepareRunning, setPrepareRunning] = useState(false);
  const [answerRunning, setAnswerRunning] = useState(false);
  const [answer, setAnswer] = useState("");
  const [followUps, setFollowUps] = useState<
    ReturnType<typeof selectFollowUps>
  >([]);
  const [followAnswers, setFollowAnswers] = useState<Record<string, string>>(
    {},
  );
  const [followIndex, setFollowIndex] = useState(0);
  const [confidence, setConfidence] = useState(3);
  const [report, setReport] = useState<MockExamReport | null>(null);
  const [celebrations, setCelebrations] = useState<LearningCelebration[]>([]);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  useEffect(() => {
    if (!prepareRunning || prepareLeft <= 0) {
      if (prepareRunning && prepareLeft <= 0) setPrepareRunning(false);
      return;
    }
    const t = window.setTimeout(() => setPrepareLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [prepareRunning, prepareLeft]);

  useEffect(() => {
    if (!answerRunning || answerLeft <= 0) {
      if (answerRunning && answerLeft <= 0) setAnswerRunning(false);
      return;
    }
    const t = window.setTimeout(() => setAnswerLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [answerRunning, answerLeft]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  function startListening() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechError("Toto zařízení nepodporuje hlasový vstup.");
      return;
    }
    setSpeechError(null);
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
      }
    };
    rec.onerror = () => {
      setListening(false);
      setSpeechError("Hlasový vstup selhal — zkus text.");
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function startWithTopic(t: MockExamTopic) {
    setTopic(t);
    setAnswer("");
    setFollowAnswers({});
    setFollowUps([]);
    setFollowIndex(0);
    setReport(null);
    setConfidence(3);
    setPrepareLeft(t.prepareSeconds);
    setAnswerLeft(t.answerSeconds);
    setPrepareRunning(false);
    setAnswerRunning(false);
    setPhase("prepare");
  }

  function goAnswer() {
    setPrepareRunning(false);
    setAnswerLeft(topic!.answerSeconds);
    setPhase("answer");
  }

  function finishAnswer() {
    stopListening();
    setAnswerRunning(false);
    if (!topic) return;
    // Preliminary miss detection on main answer only
    const preliminary = gradeMockExam({
      topic,
      mainAnswer: answer,
      followUpAnswers: {},
      followUpAskedIds: [],
      confidenceSelf: 3,
    });
    const selected = selectFollowUps(
      topic,
      preliminary.missingPoints.map((m) => m.itemId),
      3,
    );
    setFollowUps(selected);
    if (selected.length === 0) {
      setPhase("self_assess");
    } else {
      setFollowIndex(0);
      setPhase("followups");
    }
  }

  function submitFollowUp() {
    if (followIndex + 1 < followUps.length) {
      setFollowIndex((i) => i + 1);
      return;
    }
    setPhase("self_assess");
  }

  function finalize() {
    if (!topic) return;
    const askedIds = followUps.map((f) => f.id);
    const result = gradeMockExam({
      topic,
      mainAnswer: answer,
      followUpAnswers: followAnswers,
      followUpAskedIds: askedIds,
      confidenceSelf: confidence,
    });
    setReport(result);
    setPhase("report");
    void recordMockExamProgressAction({
      score: result.overallScore,
      topicSlug: topic.slug,
    }).then((res) => {
      if (res.ok && res.celebrations.length) {
        setCelebrations(res.celebrations);
      }
    });
  }

  function reset() {
    stopListening();
    setPhase("select");
    setTopic(null);
    setReport(null);
    setCelebrations([]);
  }

  const currentFollow: MockExamFollowUp | undefined = followUps[followIndex];

  const phaseOrder = useMemo(
    () =>
      [
        "select",
        "prepare",
        "answer",
        "followups",
        "self_assess",
        "report",
      ] as MockExamPhase[],
    [],
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-2">
        <Badge tone="brand">Zkouška nanečisto</Badge>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-sm text-fg-secondary">{pack.summary}</p>
        <p className="text-caption text-fg-muted">{pack.rubricDisclaimerCs}</p>
      </header>

      <ol className="flex flex-wrap gap-1.5">
        {phaseOrder.map((p) => (
          <li key={p}>
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-1 text-caption font-semibold",
                phase === p
                  ? "bg-action text-fg-on-brand"
                  : "bg-subtle text-fg-muted",
              )}
            >
              {mockExamPhaseLabelsCs[p]}
            </span>
          </li>
        ))}
      </ol>

      {phase === "select" ? (
        <SelectPhase
          pack={pack}
          onPick={startWithTopic}
          onRandom={() => startWithTopic(pickRandomTopic(pack))}
        />
      ) : null}

      {phase === "prepare" && topic ? (
        <PreparePhase
          topic={topic}
          left={prepareLeft}
          running={prepareRunning}
          onStart={() => setPrepareRunning(true)}
          onPause={() => setPrepareRunning(false)}
          onSkip={goAnswer}
        />
      ) : null}

      {phase === "answer" && topic ? (
        <AnswerPhase
          topic={topic}
          left={answerLeft}
          running={answerRunning}
          answer={answer}
          setAnswer={setAnswer}
          listening={listening}
          speechSupported={speechSupported}
          speechError={speechError}
          onStartTimer={() => setAnswerRunning(true)}
          onPauseTimer={() => setAnswerRunning(false)}
          onStartSpeech={startListening}
          onStopSpeech={stopListening}
          onSubmit={finishAnswer}
        />
      ) : null}

      {phase === "followups" && topic && currentFollow ? (
        <FollowUpPhase
          topic={topic}
          follow={currentFollow}
          index={followIndex}
          total={followUps.length}
          value={followAnswers[currentFollow.id] ?? ""}
          onChange={(v) =>
            setFollowAnswers((m) => ({ ...m, [currentFollow.id]: v }))
          }
          onNext={submitFollowUp}
        />
      ) : null}

      {phase === "self_assess" ? (
        <SelfAssessPhase
          confidence={confidence}
          setConfidence={setConfidence}
          onSubmit={finalize}
        />
      ) : null}

      {phase === "report" && report && topic ? (
        <ReportPhase
          pack={pack}
          topic={topic}
          report={report}
          celebrations={celebrations}
          onReset={reset}
        />
      ) : null}
    </div>
  );
}

function SelectPhase({
  pack,
  onPick,
  onRandom,
}: {
  pack: MockExamPack;
  onPick: (t: MockExamTopic) => void;
  onRandom: () => void;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-canvas px-4 py-4">
      <h2 className="font-display text-xl text-fg">Vyber téma</h2>
      <Button type="button" onClick={onRandom}>
        Náhodné téma
      </Button>
      <ul className="space-y-2">
        {pack.topics.map((t) => (
          <li key={t.slug}>
            <button
              type="button"
              onClick={() => onPick(t)}
              className="w-full rounded-xl border border-border px-4 py-3 text-left transition hover:border-action/50"
            >
              <p className="font-display text-body-md text-fg">{t.title}</p>
              <p className="text-caption text-fg-muted">{t.subtitle}</p>
              <p className="mt-1 text-caption text-fg-secondary">
                Příprava {t.prepareSeconds}s · odpověď {t.answerSeconds}s
              </p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TimerBadge({
  left,
  dangerBelow = 15,
}: {
  left: number;
  dangerBelow?: number;
}) {
  return (
    <Badge tone={left <= dangerBelow ? "danger" : "neutral"}>
      {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
    </Badge>
  );
}

function PreparePhase({
  topic,
  left,
  running,
  onStart,
  onPause,
  onSkip,
}: {
  topic: MockExamTopic;
  left: number;
  running: boolean;
  onStart: () => void;
  onPause: () => void;
  onSkip: () => void;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-canvas px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl text-fg">Příprava</h2>
        <TimerBadge left={left} />
      </div>
      <p className="text-body-sm font-semibold text-fg">{topic.title}</p>
      <p className="text-body-sm text-fg-secondary">{topic.prompt}</p>
      <div className="rounded-xl bg-subtle px-3 py-3">
        <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
          Modelová struktura (nápověda)
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-body-sm text-fg">
          {topic.modelStructure.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
      <div className="flex flex-wrap gap-2">
        {!running ? (
          <Button type="button" onClick={onStart}>
            Start časovače
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={onPause}>
            Pauza
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onSkip}>
          Připraven — k odpovědi
        </Button>
      </div>
    </section>
  );
}

function AnswerPhase({
  topic,
  left,
  running,
  answer,
  setAnswer,
  listening,
  speechSupported,
  speechError,
  onStartTimer,
  onPauseTimer,
  onStartSpeech,
  onStopSpeech,
  onSubmit,
}: {
  topic: MockExamTopic;
  left: number;
  running: boolean;
  answer: string;
  setAnswer: (v: string) => void;
  listening: boolean;
  speechSupported: boolean;
  speechError: string | null;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onStartSpeech: () => void;
  onStopSpeech: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-canvas px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl text-fg">Odpověď</h2>
        <TimerBadge left={left} />
      </div>
      <p className="text-body-sm text-fg-secondary">{topic.prompt}</p>
      <div className="flex flex-wrap gap-2">
        {!running ? (
          <Button type="button" size="sm" variant="secondary" onClick={onStartTimer}>
            Start časovače
          </Button>
        ) : (
          <Button type="button" size="sm" variant="secondary" onClick={onPauseTimer}>
            Pauza
          </Button>
        )}
        {speechSupported ? (
          listening ? (
            <Button type="button" size="sm" variant="danger" onClick={onStopSpeech}>
              Stop hlas
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={onStartSpeech}>
              Říct nahlas
            </Button>
          )
        ) : (
          <span className="text-caption text-fg-muted">Hlas není podporován — piš text.</span>
        )}
      </div>
      {speechError ? (
        <Alert tone="warning" title="Hlas">
          {speechError}
        </Alert>
      ) : null}
      <label className="block space-y-1">
        <span className="sr-only">Ústní odpověď</span>
        <textarea
          className="min-h-44 w-full rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-fg"
          placeholder="Piš nebo diktuj ústní odpověď…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
      </label>
      <Button
        type="button"
        onClick={onSubmit}
        disabled={answer.trim().length < 12}
      >
        Odevzdat odpověď
      </Button>
    </section>
  );
}

function FollowUpPhase({
  topic,
  follow,
  index,
  total,
  value,
  onChange,
  onNext,
}: {
  topic: MockExamTopic;
  follow: MockExamFollowUp;
  index: number;
  total: number;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const linked = topic.checklist.find((c) => c.id === follow.checklistItemId);
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-canvas px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl text-fg">Doplňující otázky</h2>
        <Badge tone="info">
          {index + 1}/{total}
        </Badge>
      </div>
      <p className="text-caption text-fg-muted">
        Systém se ptá na to, co v hlavní odpovědi chybělo
        {linked ? `: ${linked.label}` : ""}.
      </p>
      <p className="text-body-md font-semibold text-fg">{follow.question}</p>
      <label className="block space-y-1">
        <span className="sr-only">Doplňující odpověď</span>
        <textarea
          className="min-h-24 w-full rounded-xl border border-border bg-surface px-3 py-2 text-body-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Krátká doplňující odpověď…"
        />
      </label>
      <Button type="button" onClick={onNext} disabled={value.trim().length < 2}>
        {index + 1 < total ? "Další otázka" : "K sebehodnocení"}
      </Button>
    </section>
  );
}

function SelfAssessPhase({
  confidence,
  setConfidence,
  onSubmit,
}: {
  confidence: number;
  setConfidence: (n: number) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-canvas px-4 py-4">
      <h2 className="font-display text-xl text-fg">Sebehodnocení</h2>
      <p className="text-body-sm text-fg-secondary">
        Jak si jistý/á svou odpovědí? (vstup do dimenze Confidence — není školní
        známka)
      </p>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <Button
            key={n}
            type="button"
            size="sm"
            variant={confidence === n ? "primary" : "outline"}
            onClick={() => setConfidence(n)}
          >
            {n}
          </Button>
        ))}
      </div>
      <p className="text-caption text-fg-muted">
        1 = nejistý · 5 = velmi jistý
      </p>
      <Button type="button" onClick={onSubmit}>
        Zobrazit hodnocení
      </Button>
    </section>
  );
}

function ReportPhase({
  pack,
  topic,
  report,
  celebrations,
  onReset,
}: {
  pack: MockExamPack;
  topic: MockExamTopic;
  report: MockExamReport;
  celebrations: LearningCelebration[];
  onReset: () => void;
}) {
  return (
    <section className="space-y-5 rounded-2xl border border-border bg-canvas px-4 py-4">
      {celebrations.length > 0 ? (
        <LearningCelebrationQueue initial={celebrations} />
      ) : null}
      <div className="space-y-2">
        <h2 className="font-display text-xl text-fg">Hodnocení</h2>
        <Alert tone="info" title="Rubrika — ne známka">
          {report.disclaimerCs}
          {report.isOfficialSchoolGrade ? null : (
            <p className="mt-1 text-caption">
              isOfficialSchoolGrade = false · skóre {report.overallScore}/100 dle
              vah Coverage {mockExamRubric.weights.coverage * 100}% · Accuracy{" "}
              {mockExamRubric.weights.accuracy * 100}% · Structure{" "}
              {mockExamRubric.weights.structure * 100}% · Key facts{" "}
              {mockExamRubric.weights.key_facts * 100}% · Terminology{" "}
              {mockExamRubric.weights.terminology * 100}% · Confidence{" "}
              {mockExamRubric.weights.confidence * 100}%
            </p>
          )}
        </Alert>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={
              report.band === "strong"
                ? "success"
                : report.band === "partial"
                  ? "warning"
                  : "danger"
            }
          >
            {mockExamBandLabelsCs[report.band]}
          </Badge>
          <span className="text-body-sm text-fg-secondary">
            Celkové skóre rubriky: {report.overallScore}/100
          </span>
        </div>
      </div>

      <div>
        <h3 className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
          Dimenzionální skóre
        </h3>
        <ul className="mt-2 space-y-2">
          {mockExamDimensions.map((dim) => (
            <li key={dim} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-caption text-fg-secondary">
                {mockExamDimensionLabelsCs[dim]}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-subtle">
                <div
                  className="h-full rounded-full bg-action"
                  style={{ width: `${report.dimensions[dim]}%` }}
                />
              </div>
              <span className="w-10 text-right text-caption font-semibold tabular-nums">
                {report.dimensions[dim]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Block title="Silné stránky">
        <ul className="list-disc space-y-1 pl-5 text-body-sm">
          {report.strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Block>

      <Block title="Chybějící body">
        {report.missingPoints.length === 0 ? (
          <p className="text-body-sm text-fg-secondary">Nic zásadního nechybí.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-body-sm">
            {report.missingPoints.map((m) => (
              <li key={m.itemId}>
                <strong>{m.label}</strong>
                {m.isKeyFact ? " (key fact)" : ""}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Nepřesnosti">
        {report.inaccuracies.length === 0 ? (
          <p className="text-body-sm text-fg-secondary">Žádné detekované nepřesnosti.</p>
        ) : (
          <ul className="space-y-2 text-body-sm">
            {report.inaccuracies.map((i) => (
              <li key={i.id}>
                <strong>{i.label}</strong>
                <span className="text-fg-secondary"> — {i.correction}</span>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Co zopakovat">
        <ul className="list-disc space-y-1 pl-5 text-body-sm">
          {report.toReview.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {topic.relatedLearnHref ? (
          <Link
            href={topic.relatedLearnHref}
            className="mt-2 inline-block text-body-sm font-semibold text-action hover:underline"
          >
            Procvičit téma →
          </Link>
        ) : null}
      </Block>

      <Block title="Modelová struktura odpovědi">
        <ol className="list-decimal space-y-1 pl-5 text-body-sm">
          {report.modelStructure.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <details className="mt-3">
          <summary className="cursor-pointer text-body-sm font-semibold text-action">
            Ukázka výborné odpovědi
          </summary>
          <p className="mt-2 text-body-sm text-fg-secondary">
            {topic.excellentAnswer}
          </p>
        </details>
      </Block>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onReset}>
          Nová zkouška
        </Button>
        <Link
          href="/app/learn"
          className="inline-flex min-h-11 items-center rounded-md px-4 text-body-sm font-semibold text-fg-secondary hover:underline"
        >
          ← Učit se
        </Link>
      </div>
      <p className="text-caption text-fg-muted">
        Pack: {pack.slug} · téma {topic.slug} · confidence self{" "}
        {report.confidenceSelf}/5 · slov {report.wordCount}
      </p>
    </section>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}
