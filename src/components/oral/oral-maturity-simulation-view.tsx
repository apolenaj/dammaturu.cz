"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  briefToMockTopic,
  oralSimulationPhaseLabelsCs,
  selectFollowUps,
  type OralExaminerBrief,
  type OralSimulationMode,
  type OralSimulationPhase,
  type OralSimulationSelectView,
} from "@/domain/learning/oral-maturity-simulation";
import {
  enrichOralReport,
  followUpCountForPersonality,
  oralExaminerPersonalities,
  oralExaminerPersonalityHintsCs,
  oralExaminerPersonalityLabelsCs,
  styleClosing,
  styleFollowUps,
  styleMainPrompt,
  styleOpeningPrompt,
  type OralExaminerPersonality,
  type OralExaminerTurn,
} from "@/domain/learning/oral-examiner-personality";
import {
  gradeOralSimulationAction,
  startOralSimulationAction,
} from "@/server/actions/oral-maturity-simulation";
import { useOralVoice } from "@/components/oral/use-oral-voice";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type EnrichedReport = ReturnType<typeof enrichOralReport>;

export function OralMaturitySimulationView({
  selectView,
}: {
  selectView: OralSimulationSelectView;
}) {
  const [phase, setPhase] = useState<OralSimulationPhase>("select");
  const [mode, setMode] = useState<OralSimulationMode>("book");
  const [personality, setPersonality] =
    useState<OralExaminerPersonality>("standard_teacher");
  const [bookId, setBookId] = useState(selectView.books[0]?.id ?? "");
  const [brief, setBrief] = useState<OralExaminerBrief | null>(null);
  const [dialogue, setDialogue] = useState<OralExaminerTurn[]>([]);
  const [prepareLeft, setPrepareLeft] = useState(0);
  const [answerLeft, setAnswerLeft] = useState(0);
  const [prepareRunning, setPrepareRunning] = useState(false);
  const [answerRunning, setAnswerRunning] = useState(false);
  const [answer, setAnswer] = useState("");
  const [followTurns, setFollowTurns] = useState<OralExaminerTurn[]>([]);
  const [followIndex, setFollowIndex] = useState(0);
  const [followAnswers, setFollowAnswers] = useState<Record<string, string>>(
    {},
  );
  const [confidence, setConfidence] = useState(3);
  const [report, setReport] = useState<EnrichedReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const voice = useOralVoice({
    onFinalTranscript: (chunk) => {
      if (phase === "answer") {
        setAnswer((prev) => {
          const base = prev.trim();
          return base ? `${base} ${chunk}` : chunk;
        });
      } else if (phase === "followups" && followTurns[followIndex]) {
        const id = followTurns[followIndex]!.id;
        setFollowAnswers((prev) => {
          const base = (prev[id] ?? "").trim();
          return {
            ...prev,
            [id]: base ? `${base} ${chunk}` : chunk,
          };
        });
      }
    },
  });

  const topic = useMemo(
    () => (brief ? briefToMockTopic(brief) : null),
    [brief],
  );

  useEffect(() => {
    if (!prepareRunning) return;
    if (prepareLeft <= 0) {
      setPrepareRunning(false);
      return;
    }
    const t = setTimeout(() => setPrepareLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [prepareRunning, prepareLeft]);

  useEffect(() => {
    if (!answerRunning) return;
    if (answerLeft <= 0) {
      setAnswerRunning(false);
      voice.stopListening();
      return;
    }
    const t = setTimeout(() => setAnswerLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only tick on timer state
  }, [answerRunning, answerLeft]);

  function pushDialogue(turn: OralExaminerTurn) {
    setDialogue((d) => [...d, turn]);
    voice.speak(turn.speakCs);
  }

  function startSession() {
    setError(null);
    startTransition(async () => {
      if (voice.sttSupported) {
        await voice.requestMicPermission();
      }
      const res = await startOralSimulationAction({
        mode,
        bookId: mode === "book" ? bookId : null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBrief(res.brief);
      setPrepareLeft(res.brief.prepareSeconds);
      setAnswerLeft(res.brief.answerSeconds);
      setAnswer("");
      setFollowAnswers({});
      setFollowIndex(0);
      setFollowTurns([]);
      setReport(null);
      setDialogue([]);
      const intro = styleOpeningPrompt(personality, res.brief);
      setDialogue([intro]);
      voice.speak(intro.speakCs);
      setPrepareRunning(true);
      setPhase("prepare");
    });
  }

  function goToAnswer() {
    if (!brief) return;
    setPrepareRunning(false);
    const prompt = styleMainPrompt(personality, brief);
    pushDialogue(prompt);
    setAnswerRunning(true);
    setAnswerLeft(brief.answerSeconds);
    setPhase("answer");
  }

  function submitAnswer() {
    if (!topic || !brief) return;
    voice.stopListening();
    setAnswerRunning(false);
    const preliminaryMissing: string[] = [];
    const norm = answer.toLowerCase();
    for (const item of brief.checklist) {
      const hit = [item.label, ...item.synonyms].some((c) => {
        const n = c.toLowerCase().trim();
        return n.length >= 3 && norm.includes(n.slice(0, Math.min(n.length, 24)));
      });
      if (!hit) preliminaryMissing.push(item.id);
    }
    const fus = selectFollowUps(
      topic,
      preliminaryMissing,
      followUpCountForPersonality(personality),
    );
    const styled = styleFollowUps(personality, fus, brief.checklist);
    setFollowTurns(styled);
    if (styled.length === 0) {
      pushDialogue(styleClosing(personality));
      setPhase("self_assess");
    } else {
      setFollowIndex(0);
      pushDialogue(styled[0]!);
      setPhase("followups");
    }
  }

  function nextFollowUp() {
    voice.stopListening();
    if (followIndex + 1 >= followTurns.length) {
      pushDialogue(styleClosing(personality));
      setPhase("self_assess");
      return;
    }
    const next = followIndex + 1;
    setFollowIndex(next);
    pushDialogue(followTurns[next]!);
  }

  function finishGrade() {
    if (!brief) return;
    setError(null);
    startTransition(async () => {
      const askedIds = followTurns.map((f) => f.id);
      const res = await gradeOralSimulationAction({
        mode: brief.mode,
        bookId: brief.bookId,
        mainAnswerText: answer,
        mainModality: voice.listening || answer.length > 0 ? "voice" : "text",
        followUpAnswers: followAnswers,
        followUpAskedIds: askedIds,
        confidenceSelf: confidence,
        personality,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setReport(res.report);
      setPhase("report");
    });
  }

  const phaseList: OralSimulationPhase[] = [
    "select",
    "prepare",
    "answer",
    "followups",
    "self_assess",
    "report",
  ];

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 overflow-x-clip sm:space-y-6">
      <header className="space-y-2">
        <Badge tone="brand">Ústní maturita · hlas</Badge>
        <h1 className="font-display text-display-md text-fg">
          Simulace ústní zkoušky
        </h1>
        <p className="text-body-sm text-fg-secondary">
          Průběh s mikrofonem nebo textem. Osobnost examinátora mění tón — ne
          rubriku.
        </p>
      </header>

      <ol className="flex flex-wrap gap-1.5">
        {phaseList.map((p) => (
          <li key={p}>
            <Badge tone={p === phase ? "brand" : "neutral"}>
              {oralSimulationPhaseLabelsCs[p]}
            </Badge>
          </li>
        ))}
      </ol>

      {/* Voice status strip */}
      {phase !== "select" && phase !== "report" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-subtle/40 px-3 py-2 text-caption">
          <Badge
            tone={
              voice.micPermission === "granted"
                ? "success"
                : voice.micPermission === "denied"
                  ? "danger"
                  : "neutral"
            }
          >
            Mic:{" "}
            {voice.micPermission === "granted"
              ? "OK"
              : voice.micPermission === "denied"
                ? "zamítnut"
                : "—"}
          </Badge>
          {voice.listening ? <Badge tone="warning">Nahrávám…</Badge> : null}
          {voice.speaking ? <Badge tone="info">Examinátor mluví</Badge> : null}
          <label className="ml-auto flex items-center gap-1.5 text-fg-secondary">
            <input
              type="checkbox"
              checked={voice.ttsEnabled}
              onChange={(e) => voice.setTtsEnabled(e.target.checked)}
            />
            TTS
          </label>
          {!voice.sttSupported ? (
            <span className="w-full text-warning sm:w-auto">
              Hlasový přepis tady nejde — piš text (funguje všude).
            </span>
          ) : null}
        </div>
      ) : null}

      {phase === "select" ? (
        <section className="space-y-4">
          {selectView.emptyCs ? (
            <Alert title="Nejdřív literatura" tone="warning">
              {selectView.emptyCs}{" "}
              <Link href="/app/literature" className="font-semibold underline">
                Otevřít seznam
              </Link>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Osobnost examinátora
            </p>
            <ul className="space-y-2">
              {oralExaminerPersonalities.map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => setPersonality(p)}
                    className={cn(
                      "min-h-12 w-full touch-manipulation rounded-xl border px-3 py-3 text-left",
                      personality === p
                        ? "border-action bg-action/5"
                        : "border-border bg-canvas",
                    )}
                  >
                    <p className="font-semibold text-fg">
                      {oralExaminerPersonalityLabelsCs[p]}
                    </p>
                    <p className="text-caption text-fg-secondary">
                      {oralExaminerPersonalityHintsCs[p]}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Režim výběru díla
            </p>
            <ul className="space-y-2">
              {selectView.modes.map((m) => (
                <li key={m.mode}>
                  <button
                    type="button"
                    onClick={() => setMode(m.mode)}
                    className={cn(
                      "min-h-12 w-full touch-manipulation rounded-xl border px-3 py-3 text-left",
                      mode === m.mode
                        ? "border-action bg-action/5"
                        : "border-border bg-canvas",
                    )}
                  >
                    <p className="font-semibold text-fg">{m.labelCs}</p>
                    <p className="text-caption text-fg-secondary">{m.hintCs}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {mode === "book" ? (
            <label className="block space-y-1">
              <span className="text-caption font-semibold text-fg-muted">
                Kniha
              </span>
              <select
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                className="min-h-12 w-full rounded-md border border-border bg-canvas px-3 text-base"
              >
                {selectView.books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.titleCs} ({b.masteryScorePct} %)
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <Button
            type="button"
            fullWidth
            size="lg"
            className="min-h-12"
            disabled={pending || !selectView.canStart}
            onClick={startSession}
          >
            {voice.sttSupported
              ? "Požádat o mikrofon a zahájit"
              : "Zahájit (text)"}
          </Button>
        </section>
      ) : null}

      {/* Live dialogue */}
      {dialogue.length > 0 && phase !== "select" && phase !== "report" ? (
        <section className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border bg-canvas px-3 py-3">
          {dialogue.map((t, i) => (
            <div key={`${t.id}-${i}`} className="text-body-sm">
              <span className="font-semibold text-action">{t.speakerCs}: </span>
              <span className="text-fg">{t.textCs}</span>
            </div>
          ))}
        </section>
      ) : null}

      {phase === "prepare" && brief ? (
        <section className="space-y-4">
          <p className="font-display text-3xl tabular-nums text-fg">
            Příprava {formatTime(prepareLeft)}
          </p>
          {!brief.evidenceSufficient ? (
            <Alert title="Málo evidence" tone="warning">
              {brief.evidenceGapCs}
            </Alert>
          ) : (
            <Alert title="Hodnotíme proti" tone="info">
              {brief.evidenceSummaryCs.join(" · ")}
            </Alert>
          )}
          <Button type="button" fullWidth onClick={goToAnswer}>
            Zahájit odpověď
          </Button>
        </section>
      ) : null}

      {phase === "answer" && brief ? (
        <section className="space-y-4">
          <p className="font-display text-2xl tabular-nums text-fg">
            {formatTime(answerLeft)}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="button"
              className="min-h-12"
              variant={voice.listening ? "danger" : "primary"}
              disabled={!voice.sttSupported}
              onClick={() =>
                voice.listening ? voice.stopListening() : void voice.startListening()
              }
            >
              {voice.listening
                ? "Stop mikrofon"
                : voice.sttSupported
                  ? "Mluvit (STT)"
                  : "Mikrofon nedostupný"}
            </Button>
            {voice.interim ? (
              <span className="text-caption italic text-fg-muted">
                …{voice.interim}
              </span>
            ) : null}
          </div>
          <label className="block space-y-1">
            <span className="text-caption font-semibold text-fg-muted">
              Přepis odpovědi
            </span>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={8}
              placeholder="Piš nebo nech přepsat hlas — vždy můžeš dopisovat."
              className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-base"
            />
          </label>
          <div className="sticky-study-cta">
            <Button
              type="button"
              fullWidth
              size="lg"
              className="min-h-12"
              disabled={answer.trim().length < 20}
              onClick={submitAnswer}
            >
              Dokončit výklad
            </Button>
          </div>
        </section>
      ) : null}

      {phase === "followups" && followTurns[followIndex] ? (
        <section className="space-y-4">
          <Badge tone="warning">
            Doplňující {followIndex + 1}/{followTurns.length}
          </Badge>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="min-h-12"
              variant={voice.listening ? "danger" : "secondary"}
              disabled={!voice.sttSupported}
              onClick={() =>
                voice.listening ? voice.stopListening() : void voice.startListening()
              }
            >
              {voice.listening
                ? "Stop mikrofon"
                : voice.sttSupported
                  ? "Odpovědět hlasem"
                  : "Piš text níže"}
            </Button>
          </div>
          <textarea
            value={followAnswers[followTurns[followIndex]!.id] ?? ""}
            onChange={(e) =>
              setFollowAnswers((prev) => ({
                ...prev,
                [followTurns[followIndex]!.id]: e.target.value,
              }))
            }
            rows={5}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-base"
          />
          <div className="sticky-study-cta">
            <Button type="button" fullWidth size="lg" className="min-h-12" onClick={nextFollowUp}>
              {followIndex + 1 >= followTurns.length
                ? "K sebehodnocení"
                : "Další otázka komise"}
            </Button>
          </div>
        </section>
      ) : null}

      {phase === "self_assess" ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl text-fg">Sebehodnocení jistoty</h2>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setConfidence(n)}
                className={cn(
                  "min-h-12 min-w-12 touch-manipulation rounded-md border px-3 font-semibold",
                  confidence === n
                    ? "border-action bg-action text-fg-on-brand"
                    : "border-border bg-canvas text-fg",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="sticky-study-cta">
            <Button
              type="button"
              fullWidth
              size="lg"
              className="min-h-12"
              disabled={pending}
              onClick={finishGrade}
            >
              Vyhodnotit (evidence)
            </Button>
          </div>
        </section>
      ) : null}

      {phase === "report" && report ? (
        <ReportPanel
          report={report}
          onRestart={() => {
            voice.stopSpeaking();
            setPhase("select");
            setBrief(null);
            setReport(null);
            setDialogue([]);
          }}
        />
      ) : null}

      {voice.error || error ? (
        <Alert title="Upozornění" tone="danger">
          {error ?? voice.error}
        </Alert>
      ) : null}
    </div>
  );
}

function ReportPanel({
  report,
  onRestart,
}: {
  report: EnrichedReport;
  onRestart: () => void;
}) {
  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-border bg-subtle/40 px-4 py-4">
        <p className="text-caption text-fg-muted">
          {report.bookTitleCs} · {report.personalityLabelCs}
        </p>
        {report.insufficientEvidence ? (
          <p className="mt-2 font-display text-xl text-fg">Bez falešného skóre</p>
        ) : (
          <p className="mt-1 font-display text-3xl text-fg">
            {report.overallScore}/100
          </p>
        )}
        <p className="text-body-sm text-fg-secondary">{report.disclaimerCs}</p>
      </div>

      {!report.insufficientEvidence ? (
        <>
          <Block title="Silné stránky">
            <ul className="list-disc space-y-1 pl-4 text-body-sm">
              {report.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Block>

          <Block title="Chybějící body">
            {report.missingPoints.length === 0 ? (
              <p className="text-body-sm text-fg-secondary">Nic zásadního nechybí.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-4 text-body-sm">
                {report.missingPoints.map((m) => (
                  <li key={m.itemId}>
                    {m.label} — {m.reviewHintCs}
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title="Nepřesná tvrzení">
            {report.inaccuracies.length === 0 ? (
              <p className="text-body-sm text-fg-secondary">
                Žádné známé chybové vzory.
              </p>
            ) : (
              <ul className="list-disc space-y-1 pl-4 text-body-sm">
                {report.inaccuracies.map((i) => (
                  <li key={i.id}>
                    {i.label}: {i.correction}
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title="Projev (filler / struktura)">
            <p className="text-body-sm text-fg-secondary">
              {report.delivery.wordCount} slov · {report.delivery.sentenceCount}{" "}
              vět · výplně {report.delivery.fillerCount}×
              {report.delivery.fillerExamples.length > 0
                ? ` (${report.delivery.fillerExamples.join(", ")})`
                : ""}
            </p>
            {report.delivery.fillerNoteCs ? (
              <p className="mt-1 text-body-sm text-fg">{report.delivery.fillerNoteCs}</p>
            ) : null}
            {report.delivery.structureNoteCs ? (
              <p className="mt-1 text-body-sm text-fg">
                {report.delivery.structureNoteCs}
              </p>
            ) : (
              <p className="mt-1 text-body-sm text-fg-secondary">
                Struktura projevu bez výrazného varování.
              </p>
            )}
          </Block>

          <Block title="Doporučené procvičení">
            <ul className="space-y-2">
              {report.nextPractice.map((p) => (
                <li key={p.titleCs}>
                  <Link
                    href={p.href}
                    className="block rounded-xl border border-border bg-canvas px-3 py-2 hover:border-action/40"
                  >
                    <p className="font-semibold text-fg">{p.titleCs}</p>
                    <p className="text-caption text-fg-secondary">{p.reasonCs}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Block>
        </>
      ) : (
        <ul className="list-disc pl-4 text-body-sm">
          {report.toReview.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}

      <Button type="button" variant="secondary" fullWidth onClick={onRestart}>
        Nová simulace
      </Button>
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
    <div className="space-y-2">
      <h3 className="font-display text-lg text-fg">{title}</h3>
      {children}
    </div>
  );
}
