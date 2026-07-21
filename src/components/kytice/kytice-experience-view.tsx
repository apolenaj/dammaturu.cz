"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  gradeGuiltMatch,
  gradeRecognize,
  gradeWhichBallad,
  kyticeGameModeLabelsCs,
  type KyticeBallad,
  type KyticeExperiencePack,
  type KyticeGameMode,
} from "@/domain/learning/kytice-experience";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function KyticeExperienceView({ pack }: { pack: KyticeExperiencePack }) {
  const [mode, setMode] = useState<KyticeGameMode>("collection");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    pack.ballads[0]?.slug ?? null,
  );
  const selected = useMemo(
    () => pack.ballads.find((b) => b.slug === selectedSlug) ?? pack.ballads[0]!,
    [pack.ballads, selectedSlug],
  );

  const modes: KyticeGameMode[] = [
    "collection",
    "recognize",
    "match",
    "which",
    "reconstruction",
  ];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-2">
        <Badge tone="brand">Kytice experience</Badge>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-md text-fg-secondary">
          {pack.author} · {pack.themeCs}
        </p>
        <p className="text-body-sm text-fg-secondary">{pack.summary}</p>
        <p className="text-caption text-fg-muted">
          Motiv: {pack.motifOverviewCs} · SOURCE {pack.sourceFilename} · verified
          KU only
        </p>
      </header>

      <div
        role="tablist"
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
      >
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-caption font-semibold transition",
              mode === m
                ? "bg-surface text-fg shadow-xs ring-1 ring-border"
                : "bg-subtle text-fg-secondary hover:text-fg",
            )}
          >
            {kyticeGameModeLabelsCs[m]}
          </button>
        ))}
      </div>

      {mode === "collection" ? (
        <CollectionPanel
          pack={pack}
          selected={selected}
          onSelect={setSelectedSlug}
        />
      ) : null}
      {mode === "recognize" ? <RecognizeGame pack={pack} /> : null}
      {mode === "match" ? <MatchGame pack={pack} /> : null}
      {mode === "which" ? <WhichGame pack={pack} /> : null}
      {mode === "reconstruction" ? <ReconstructionPanel pack={pack} /> : null}

      <div className="flex flex-wrap gap-2">
        <Link
          href={pack.literaryWorkHref}
          className="text-body-sm font-semibold text-action hover:underline"
        >
          Plný rozbor (14 tabů) →
        </Link>
        <Link
          href="/app/learn"
          className="text-body-sm font-semibold text-fg-secondary hover:underline"
        >
          ← Učit se
        </Link>
      </div>
    </div>
  );
}

function CollectionPanel({
  pack,
  selected,
  onSelect,
}: {
  pack: KyticeExperiencePack;
  selected: KyticeBallad;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {pack.ballads.map((b) => (
          <li key={b.slug}>
            <button
              type="button"
              onClick={() => onSelect(b.slug)}
              className={cn(
                "w-full rounded-xl border px-3 py-3 text-left transition",
                selected.slug === b.slug
                  ? "border-action bg-action/5"
                  : "border-border bg-canvas hover:border-action/40",
              )}
            >
              <p className="font-display text-body-md text-fg">{b.title}</p>
              <p className="mt-0.5 line-clamp-2 text-caption text-fg-muted">
                {b.motif}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <article className="space-y-3 rounded-2xl border border-border bg-canvas px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl text-fg">{selected.title}</h2>
          <Badge tone="success">verified</Badge>
        </div>
        <Field label="Stručný příběh" value={selected.storyBrief} />
        <Field label="Hlavní konflikt" value={selected.mainConflict} />
        <Field label="Vina" value={selected.guilt} />
        <Field label="Trest / následek" value={selected.punishment} />
        <Field label="Motiv" value={selected.motif} />
        <Field label="Zapamatovatelný bod" value={selected.memorablePoint} />
        <p className="text-caption text-fg-muted">
          KU: {selected.evidence.knowledgeUnitId} ·{" "}
          {selected.evidence.validationStatus}
        </p>
        {selected.storyReconstructionSlug ? (
          <Link
            href={`${pack.reconstructionPackHref}`}
            className="inline-flex min-h-10 items-center rounded-md bg-action px-3 text-body-sm font-semibold text-fg-on-brand"
          >
            Story reconstruction
          </Link>
        ) : null}
      </article>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
        {label}
      </p>
      <p className="mt-0.5 text-body-sm text-fg">{value}</p>
    </div>
  );
}

function RecognizeGame({ pack }: { pack: KyticeExperiencePack }) {
  const items = pack.games.recognizeByStory;
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const item = items[i]!;

  function answer(choice: number) {
    if (feedback) return;
    const ok = gradeRecognize(item, choice);
    if (ok) setScore((s) => s + 1);
    setFeedback(ok ? "Správně." : `Špatně — je to ${item.options[item.correctIndex]}.`);
  }

  function next() {
    setFeedback(null);
    setI((x) => (x + 1) % items.length);
  }

  return (
    <GameShell
      title={kyticeGameModeLabelsCs.recognize}
      score={`${score} / ${items.length}`}
    >
      <p className="text-body-md text-fg">{item.promptStory}</p>
      <div className="mt-3 space-y-2">
        {item.options.map((opt, idx) => (
          <button
            key={opt}
            type="button"
            disabled={!!feedback}
            onClick={() => answer(idx)}
            className="w-full rounded-md border border-border px-3 py-2 text-left text-body-sm hover:border-action/40 disabled:opacity-70"
          >
            {opt}
          </button>
        ))}
      </div>
      {feedback ? (
        <div className="mt-3 space-y-2">
          <Alert title="Výsledek" tone={feedback.startsWith("Správně") ? "success" : "warning"}>
            {feedback}
          </Alert>
          <Button onClick={next}>Další</Button>
        </div>
      ) : null}
    </GameShell>
  );
}

function WhichGame({ pack }: { pack: KyticeExperiencePack }) {
  const items = pack.games.whichBallad;
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const item = items[i]!;

  function answer(choice: number) {
    if (feedback) return;
    const ok = gradeWhichBallad(item, choice);
    if (ok) setScore((s) => s + 1);
    setFeedback(ok ? "Správně." : `Špatně — ${item.options[item.correctIndex]}.`);
  }

  return (
    <GameShell
      title={kyticeGameModeLabelsCs.which}
      score={`${score} / ${items.length}`}
    >
      <p className="text-body-md text-fg">{item.clue}</p>
      <div className="mt-3 space-y-2">
        {item.options.map((opt, idx) => (
          <button
            key={`${item.id}-${opt}`}
            type="button"
            disabled={!!feedback}
            onClick={() => answer(idx)}
            className="w-full rounded-md border border-border px-3 py-2 text-left text-body-sm hover:border-action/40"
          >
            {opt}
          </button>
        ))}
      </div>
      {feedback ? (
        <div className="mt-3 space-y-2">
          <Alert title="Výsledek" tone={feedback.startsWith("Správně") ? "success" : "warning"}>
            {feedback}
          </Alert>
          <Button
            onClick={() => {
              setFeedback(null);
              setI((x) => (x + 1) % items.length);
            }}
          >
            Další
          </Button>
        </div>
      ) : null}
    </GameShell>
  );
}

function MatchGame({ pack }: { pack: KyticeExperiencePack }) {
  const pairs = pack.games.matchGuiltConsequence;
  const punishments = useMemo(() => {
    const list = pairs.map((p) => p.punishment);
    // stable shuffle by joining ids
    const seed = pairs.map((p) => p.id).join("|");
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
      h = (h * 1664525 + 1013904223) >>> 0;
      const j = h % (i + 1);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }, [pairs]);

  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    correct: number;
    total: number;
  } | null>(null);

  return (
    <GameShell title={kyticeGameModeLabelsCs.match} score={result ? `${result.correct}/${result.total}` : "—"}>
      <p className="text-body-sm text-fg-secondary">
        Ke každému provinění vyber následek.
      </p>
      <ul className="mt-3 space-y-3">
        {pairs.map((p) => (
          <li key={p.id} className="rounded-xl border border-border px-3 py-3">
            <p className="text-body-sm font-medium text-fg">{p.guilt}</p>
            <select aria-label="Výběr párování"
              className="mt-2 w-full rounded-md border border-border bg-canvas px-2 py-2 text-body-sm"
              value={mapping[p.id] ?? ""}
              onChange={(e) =>
                setMapping((m) => ({ ...m, [p.id]: e.target.value }))
              }
            >
              <option value="">— vyber následek —</option>
              {punishments.map((pun) => (
                <option key={pun} value={pun}>
                  {pun}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            const g = gradeGuiltMatch(pairs, mapping);
            setResult({ correct: g.correct, total: g.total });
          }}
        >
          Vyhodnotit
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setMapping({});
            setResult(null);
          }}
        >
          Reset
        </Button>
      </div>
      {result ? (
        <Alert
          className="mt-3"
          title={result.correct === result.total ? "Perfektní" : "Výsledek"}
          tone={result.correct === result.total ? "success" : "warning"}
        >
          {result.correct} z {result.total} správně.
        </Alert>
      ) : null}
    </GameShell>
  );
}

function ReconstructionPanel({ pack }: { pack: KyticeExperiencePack }) {
  const withRecon = pack.ballads.filter((b) => b.storyReconstructionSlug);
  return (
    <div className="space-y-3 rounded-2xl border border-border px-4 py-4">
      <h2 className="font-display text-xl text-fg">
        {kyticeGameModeLabelsCs.reconstruction}
      </h2>
      <p className="text-body-sm text-fg-secondary">
        Vybrané balady se SOURCE kroky (verified). Otevři pack a seřaď děj.
      </p>
      <ul className="space-y-2">
        {withRecon.map((b) => (
          <li key={b.slug}>
            <Link
              href={pack.reconstructionPackHref}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-body-sm hover:border-action/40"
            >
              <span className="font-medium text-fg">{b.title}</span>
              <span className="text-caption text-fg-muted">
                {b.storyReconstructionSlug}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GameShell({
  title,
  score,
  children,
}: {
  title: string;
  score: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-canvas px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl text-fg">{title}</h2>
        <Badge tone="neutral">{score}</Badge>
      </div>
      {children}
    </section>
  );
}
