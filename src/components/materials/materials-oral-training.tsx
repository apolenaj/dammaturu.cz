"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  gradeMaterialsOralAnswerAction,
  retryMaterialsOralWithoutHintsAction,
  startMaterialsOralSessionAction,
} from "@/server/actions/materials-oral-training";
import {
  materialsOralModeLabelsCs,
  type MaterialsOralMode,
  type MaterialsOralPrompt,
  type MaterialsOralReport,
  type MaterialsOralSelectView,
  type MaterialsOralSession,
} from "@/domain/learning/materials-oral-training";
import { evidenceConfidenceLabelsCs } from "@/domain/learning/grounded-study";
import { useOralVoice } from "@/components/oral/use-oral-voice";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Phase = "select" | "prepare" | "answer" | "report";

export function MaterialsOralTraining({
  initialView,
}: {
  initialView: MaterialsOralSelectView;
}) {
  const [view] = useState(initialView);
  const [phase, setPhase] = useState<Phase>("select");
  const [mode, setMode] = useState<MaterialsOralMode>("question_drill");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    view.materials.slice(0, 3).map((m) => m.id),
  );
  const [topicCs, setTopicCs] = useState<string>("");
  const [session, setSession] = useState<MaterialsOralSession | null>(null);
  const [prompt, setPrompt] = useState<MaterialsOralPrompt | null>(null);
  const [answer, setAnswer] = useState("");
  const [report, setReport] = useState<MaterialsOralReport | null>(null);
  const [prepLeft, setPrepLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const voice = useOralVoice({
    onFinalTranscript: (chunk) => {
      setAnswer((prev) => (prev ? `${prev.trim()} ${chunk}` : chunk));
    },
  });

  useEffect(() => {
    if (phase !== "prepare" || prepLeft <= 0) return;
    const t = window.setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, prepLeft]);

  useEffect(() => {
    if (phase === "prepare" && prepLeft === 0 && prompt) {
      setPhase("answer");
    }
  }, [phase, prepLeft, prompt]);

  function toggleMaterial(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function start() {
    setError(null);
    startTransition(async () => {
      const res = await startMaterialsOralSessionAction({
        mode,
        materialIds: selectedIds,
        topicCs: topicCs || null,
        hideHints: true,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const first = res.session.prompts[0] ?? null;
      setSession(res.session);
      setPrompt(first);
      setAnswer("");
      setReport(null);
      const prep = first?.prepSeconds ?? 0;
      if (prep > 0) {
        setPrepLeft(prep);
        setPhase("prepare");
      } else {
        setPhase("answer");
      }
    });
  }

  function skipPrep() {
    setPrepLeft(0);
    setPhase("answer");
  }

  function submit() {
    if (!prompt) return;
    setError(null);
    startTransition(async () => {
      const res = await gradeMaterialsOralAnswerAction({
        prompt,
        studentAnswer: answer,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setReport(res.report);
      setPhase("report");
      voice.stopListening();
    });
  }

  function retryWithoutHints() {
    if (!prompt) return;
    setError(null);
    startTransition(async () => {
      const res = await retryMaterialsOralWithoutHintsAction({ prompt });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPrompt(res.prompt);
      setAnswer("");
      setReport(null);
      const prep = Math.min(30, res.prompt.prepSeconds);
      if (prep > 0) {
        setPrepLeft(prep);
        setPhase("prepare");
      } else {
        setPhase("answer");
      }
    });
  }

  function reset() {
    setPhase("select");
    setSession(null);
    setPrompt(null);
    setAnswer("");
    setReport(null);
    setError(null);
    voice.stopListening();
  }

  if (view.materials.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Alert title="Nejdřív materiály" tone="warning">
          Ústní trénink běží jen z nahraných školních / tvých materiálů. Nahraj
          PDF, DOCX nebo TXT a počkej na stav Připraveno.
        </Alert>
        <Link href="/app/materials">
          <Button>Zpět na Moje materiály</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <header className="space-y-2">
        <Badge tone="info">Ústní z materiálů</Badge>
        <h1 className="font-display text-display-md text-fg">
          Ústní trénink
        </h1>
        <p className="text-body-md text-fg-secondary">{view.disclaimerCs}</p>
      </header>

      {error ? (
        <Alert title="Chyba" tone="danger">
          {error}
        </Alert>
      ) : null}

      {phase === "select" ? (
        <section className="space-y-5 rounded-2xl border border-border bg-subtle/30 px-4 py-5">
          <fieldset className="space-y-2">
            <legend className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Režim
            </legend>
            <ul className="space-y-2">
              {view.modes.map((m) => {
                const disabled = m.id === "weak_spots" && !view.hasWeakSpots;
                const on = mode === m.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setMode(m.id)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition",
                        on
                          ? "border-action bg-action/10"
                          : "border-border bg-canvas",
                        disabled && "opacity-50",
                      )}
                    >
                      <p className="font-semibold text-fg">{m.labelCs}</p>
                      <p className="text-caption text-fg-secondary">
                        {m.hintCs}
                        {disabled ? " — zatím nemáš zaznamenané slabiny." : ""}
                      </p>
                      <p className="mt-1 text-caption text-fg-muted">
                        Příprava: {m.prepSeconds}s (lze přeskočit)
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              Materiály
            </legend>
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {view.materials.map((m) => {
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
                      <span className="block text-caption text-fg-muted">
                        {m.knowledgePointCount} KU · {m.topicCount} témat
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          {(mode === "full_topic" || mode === "random_topic") &&
          view.topics.length > 0 ? (
            <div className="space-y-2">
              <label className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
                Téma {mode === "random_topic" ? "(volitelné — jinak los)" : ""}
              </label>
              <select
                value={topicCs}
                onChange={(e) => setTopicCs(e.target.value)}
                className="w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-body-md text-fg"
              >
                <option value="">
                  {mode === "random_topic" ? "Náhodně" : "Vyber téma"}
                </option>
                {view.topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <Button
            fullWidth
            disabled={pending || selectedIds.length === 0}
            onClick={start}
          >
            {pending ? "Připravuji…" : "Začít ústní trénink"}
          </Button>
        </section>
      ) : null}

      {phase === "prepare" && prompt ? (
        <section className="space-y-4 rounded-2xl border border-action/40 bg-action/5 px-4 py-5 text-center">
          <p className="text-overline text-action">
            {materialsOralModeLabelsCs[prompt.mode]} · příprava
          </p>
          <p className="font-display text-4xl tabular-nums text-fg">
            {prepLeft}s
          </p>
          <p className="text-body-md font-semibold text-fg">
            {prompt.questionCs}
          </p>
          <p className="text-caption text-fg-secondary">
            Promysli odpověď. Nápověda ze zdroje je skrytá.
          </p>
          <Button variant="ghost" onClick={skipPrep}>
            Přeskočit přípravu
          </Button>
        </section>
      ) : null}

      {phase === "answer" && prompt ? (
        <section className="space-y-4 rounded-2xl border border-border bg-surface px-4 py-5">
          <div>
            <p className="text-overline text-action">
              {materialsOralModeLabelsCs[prompt.mode]} · {prompt.topicCs}
            </p>
            <h2 className="mt-1 font-display text-xl text-fg">
              {prompt.questionCs}
            </h2>
            <p className="mt-1 text-caption text-fg-muted">
              Zdroj: {prompt.materialTitle}
            </p>
          </div>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={8}
            placeholder="Odpověz textem (nebo použij mikrofon jako doplněk)…"
            className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-body-md text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />

          <div className="flex flex-wrap gap-2">
            {voice.sttSupported ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  if (voice.listening) voice.stopListening();
                  else void voice.startListening();
                }}
              >
                {voice.listening ? "Zastavit mikrofon" : "Mikrofon (volitelné)"}
              </Button>
            ) : (
              <p className="text-caption text-fg-muted">
                Mikrofon v tomto prohlížeči není k dispozici — použij text.
              </p>
            )}
            {voice.interim ? (
              <p className="w-full text-caption text-fg-secondary">
                …{voice.interim}
              </p>
            ) : null}
          </div>

          <Button
            fullWidth
            disabled={pending || !answer.trim()}
            onClick={submit}
          >
            {pending ? "Hodnotím…" : "Odeslat odpověď"}
          </Button>
        </section>
      ) : null}

      {phase === "report" && report && prompt ? (
        <section className="space-y-4">
          {report.lowConfidence ? (
            <Alert title="Nízká jistota hodnocení" tone="warning">
              {report.lowConfidenceNoteCs}
            </Alert>
          ) : (
            <Alert
              title={
                report.result === "correct"
                  ? "Sedí vůči materiálu"
                  : report.result === "partial"
                    ? "Částečně správně"
                    : "Slabé vůči materiálu"
              }
              tone={
                report.result === "correct"
                  ? "success"
                  : report.result === "partial"
                    ? "warning"
                    : "danger"
              }
            >
              {report.feedbackCs}
            </Alert>
          )}

          <div className="rounded-xl border border-border px-4 py-3 space-y-2">
            <p className="text-caption text-fg-muted">
              Evidence: {evidenceConfidenceLabelsCs[report.evaluationConfidence]}
            </p>
            <ReportList
              title="Správné klíčové body"
              items={report.correctKeyPoints}
              empty="Zatím žádný rozpoznaný bod."
            />
            <ReportList
              title="Chybějící klíčové body"
              items={
                report.lowConfidence
                  ? report.expectedKeyPoints
                  : report.missingKeyPoints
              }
              empty="Nic zásadního nechybí."
            />
            <ReportList
              title="Faktické nepřesnosti (vůči zdroji)"
              items={report.factualMistakes}
              empty="Žádné jasné rozpory se zdrojem."
            />
            <div>
              <p className="text-caption font-semibold text-fg-muted">
                Struktura
              </p>
              <p className="text-body-sm text-fg-secondary">
                {report.structureNoteCs}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border px-4 py-3 space-y-2">
            <p className="text-caption font-semibold text-fg-muted">
              Ideální osnova (ze zdroje)
            </p>
            <pre className="whitespace-pre-wrap font-sans text-body-sm text-fg">
              {report.idealOutlineCs}
            </pre>
            <Link
              href={report.sourceHref}
              className="inline-flex text-body-sm font-semibold text-action hover:underline"
            >
              Otevřít zdroj: {report.materialTitle} →
            </Link>
          </div>

          {report.scheduledWeakConcepts > 0 ? (
            <p className="text-caption text-fg-secondary">
              Do Moje chyby / plánu opakování zařazeno{" "}
              {report.scheduledWeakConcepts} slabých bodů.
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Button fullWidth onClick={retryWithoutHints} disabled={pending}>
              Zkusit znovu bez nápovědy
            </Button>
            <Button variant="ghost" fullWidth onClick={reset}>
              Nový trénink
            </Button>
            {session && session.cursor + 1 < session.prompts.length ? (
              <Button
                variant="secondary"
                fullWidth
                disabled={pending}
                onClick={() => {
                  const next = session.prompts[session.cursor + 1]!;
                  setSession({ ...session, cursor: session.cursor + 1 });
                  setPrompt(next);
                  setAnswer("");
                  setReport(null);
                  setPrepLeft(next.prepSeconds);
                  setPhase(next.prepSeconds > 0 ? "prepare" : "answer");
                }}
              >
                Další otázka v session
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ReportList({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div>
      <p className="text-caption font-semibold text-fg-muted">{title}</p>
      {items.length === 0 ? (
        <p className="text-body-sm text-fg-secondary">{empty}</p>
      ) : (
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-body-sm text-fg">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
