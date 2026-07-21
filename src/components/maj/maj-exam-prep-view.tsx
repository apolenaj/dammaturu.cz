"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  gradeCharacterMatches,
  gradeCompositionPuzzle,
  gradeQuoteDeviceMatches,
  gradeStoryMapOrder,
  gradeTimedOral,
  majActivityIds,
  majActivityLabelsCs,
  majKuCategoryLabelsCs,
  shuffleIdsStable,
  type MajActivityId,
  type MajActivityResult,
  type MajExamPrepPack,
  type MajKnowledgeUnit,
} from "@/domain/learning/maj-exam-prep";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function MajExamPrepView({ pack }: { pack: MajExamPrepPack }) {
  const [activity, setActivity] = useState<MajActivityId>("story_map");
  const [lastResult, setLastResult] = useState<MajActivityResult | null>(null);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-2">
        <Badge tone="brand">Máj exam prep</Badge>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-md text-fg-secondary">
          {pack.author} · SOURCE {pack.sourceFilename}
        </p>
        <p className="text-body-sm text-fg-secondary">{pack.summary}</p>
        <p className="text-caption text-fg-muted">
          {pack.knowledgeUnits.length} verified KU · po každé simulaci chybějící
          knowledge units
        </p>
      </header>

      <KuChecklist pack={pack} highlighted={lastResult?.missingKuSlugs ?? []} />

      <div
        role="tablist"
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
      >
        {majActivityIds.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activity === id}
            onClick={() => {
              setActivity(id);
              setLastResult(null);
            }}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-caption font-semibold transition",
              activity === id
                ? "bg-surface text-fg shadow-xs ring-1 ring-border"
                : "bg-subtle text-fg-secondary hover:text-fg",
            )}
          >
            {majActivityLabelsCs[id]}
          </button>
        ))}
      </div>

      {activity === "story_map" ? (
        <StoryMapActivity pack={pack} onResult={setLastResult} />
      ) : null}
      {activity === "character_map" ? (
        <CharacterMapActivity pack={pack} onResult={setLastResult} />
      ) : null}
      {activity === "composition_puzzle" ? (
        <CompositionActivity pack={pack} onResult={setLastResult} />
      ) : null}
      {activity === "quote_device" ? (
        <QuoteDeviceActivity pack={pack} onResult={setLastResult} />
      ) : null}
      {activity === "summary_60s" ? (
        <OralActivity
          pack={pack}
          activityId="summary_60s"
          onResult={setLastResult}
        />
      ) : null}
      {activity === "oral_3min" ? (
        <OralActivity
          pack={pack}
          activityId="oral_3min"
          onResult={setLastResult}
        />
      ) : null}
      {activity === "full_oral" ? (
        <OralActivity
          pack={pack}
          activityId="full_oral"
          onResult={setLastResult}
        />
      ) : null}

      {lastResult ? <MissingKuPanel pack={pack} result={lastResult} /> : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href={pack.literaryWorkHref}
          className="text-body-sm font-semibold text-action hover:underline"
        >
          Plný rozbor (14 tabů) →
        </Link>
        <Link
          href={pack.reconstructionHref}
          className="text-body-sm font-semibold text-action hover:underline"
        >
          Story reconstruction →
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

function KuChecklist({
  pack,
  highlighted,
}: {
  pack: MajExamPrepPack;
  highlighted: string[];
}) {
  const byCat = useMemo(() => {
    const map = new Map<string, MajKnowledgeUnit[]>();
    for (const ku of pack.knowledgeUnits) {
      const list = map.get(ku.category) ?? [];
      list.push(ku);
      map.set(ku.category, list);
    }
    return map;
  }, [pack.knowledgeUnits]);

  return (
    <details className="rounded-xl border border-border bg-canvas px-4 py-3">
      <summary className="cursor-pointer text-body-sm font-semibold text-fg">
        Knowledge units ({pack.knowledgeUnits.length}) — co musíš zvládnout
      </summary>
      <ul className="mt-3 space-y-3">
        {[...byCat.entries()].map(([cat, kus]) => (
          <li key={cat}>
            <p className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
              {majKuCategoryLabelsCs[cat as keyof typeof majKuCategoryLabelsCs]}
            </p>
            <ul className="mt-1 space-y-1">
              {kus.map((ku) => (
                <li
                  key={ku.slug}
                  className={cn(
                    "rounded-md px-2 py-1 text-body-sm",
                    highlighted.includes(ku.slug)
                      ? "bg-danger/10 text-danger"
                      : "text-fg",
                  )}
                >
                  {ku.title}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </details>
  );
}

function MissingKuPanel({
  pack,
  result,
}: {
  pack: MajExamPrepPack;
  result: MajActivityResult;
}) {
  const missing = result.missingKuSlugs
    .map((s) => pack.knowledgeUnits.find((k) => k.slug === s))
    .filter(Boolean) as MajKnowledgeUnit[];

  return (
    <Alert
      tone={missing.length === 0 ? "success" : "warning"}
      title={
        missing.length === 0
          ? "Žádné chybějící KU"
          : `Chybějící knowledge units (${missing.length})`
      }
    >
      <p className="text-body-sm">{result.noteCs}</p>
      <p className="mt-1 text-caption text-fg-muted">
        Skóre {result.scorePct}% · {result.correct}/{result.total}
      </p>
      {missing.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-body-sm">
          {missing.map((ku) => (
            <li key={ku.slug}>
              <strong>{ku.title}</strong>
              <span className="text-fg-secondary"> — {ku.statement}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Alert>
  );
}

function Shell({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-canvas px-4 py-4">
      <div>
        <h2 className="font-display text-xl text-fg">{title}</h2>
        {hint ? (
          <p className="mt-1 text-body-sm text-fg-secondary">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StoryMapActivity({
  pack,
  onResult,
}: {
  pack: MajExamPrepPack;
  onResult: (r: MajActivityResult) => void;
}) {
  const ordered = useMemo(
    () => [...pack.storyMap].sort((a, b) => a.order - b.order),
    [pack.storyMap],
  );
  const [ids, setIds] = useState(() =>
    shuffleIdsStable(
      ordered.map((n) => n.id),
      "story-map-v1",
    ),
  );

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    setIds((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }

  function submit() {
    onResult(gradeStoryMapOrder(pack, ids));
  }

  return (
    <Shell
      title={majActivityLabelsCs.story_map}
      hint="Seřaď 4 zpěvy + 2 intermezza chronologicky."
    >
      <ol className="space-y-2">
        {ids.map((id, i) => {
          const node = pack.storyMap.find((n) => n.id === id)!;
          return (
            <li
              key={id}
              className="flex items-start gap-2 rounded-xl border border-border px-3 py-2"
            >
              <span className="mt-1 w-6 shrink-0 text-caption font-bold text-fg-muted">
                {i + 1}.
              </span>
              <p className="flex-1 text-body-sm text-fg">{node.label}</p>
              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                 aria-label="Nahoru">
                  ↑
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => move(i, 1)}
                  disabled={i === ids.length - 1}
                 aria-label="Dolů">
                  ↓
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      <Button type="button" onClick={submit}>
        Zkontrolovat story map
      </Button>
    </Shell>
  );
}

function CharacterMapActivity({
  pack,
  onResult,
}: {
  pack: MajExamPrepPack;
  onResult: (r: MajActivityResult) => void;
}) {
  const roles = useMemo(
    () =>
      shuffleIdsStable(
        pack.characterMap.map((c) => c.role),
        "roles-v1",
      ),
    [pack.characterMap],
  );
  const [mapping, setMapping] = useState<Record<string, string>>({});

  return (
    <Shell
      title={majActivityLabelsCs.character_map}
      hint="Přiřaď každé postavě správnou roli ze SOURCE."
    >
      <ul className="space-y-4">
        {pack.characterMap.map((c) => (
          <li key={c.id} className="space-y-2">
            <div>
              <p className="font-display text-body-md text-fg">{c.name}</p>
              <p className="text-caption text-fg-muted">
                rysy: {c.traits.join(" · ")}
              </p>
            </div>
            <select
              aria-label={`Role pro ${c.name}`}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm"
              value={mapping[c.id] ?? ""}
              onChange={(e) =>
                setMapping((m) => ({ ...m, [c.id]: e.target.value }))
              }
            >
              <option value="">— vyber roli —</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        onClick={() => onResult(gradeCharacterMatches(pack, mapping))}
      >
        Zkontrolovat postavy
      </Button>
    </Shell>
  );
}

function CompositionActivity({
  pack,
  onResult,
}: {
  pack: MajExamPrepPack;
  onResult: (r: MajActivityResult) => void;
}) {
  const [ids, setIds] = useState(() =>
    shuffleIdsStable(
      pack.compositionPuzzle.map((p) => p.id),
      "comp-v1",
    ),
  );

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    setIds((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }

  return (
    <Shell
      title={majActivityLabelsCs.composition_puzzle}
      hint="Slož kompozici: dedikace → zpěvy → intermezza."
    >
      <ol className="space-y-2">
        {ids.map((id, i) => {
          const piece = pack.compositionPuzzle.find((p) => p.id === id)!;
          return (
            <li
              key={id}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
            >
              <span className="w-6 text-caption font-bold text-fg-muted">
                {i + 1}.
              </span>
              <p className="flex-1 text-body-sm">{piece.label}</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => move(i, -1)}
                disabled={i === 0}
               aria-label="Nahoru">
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => move(i, 1)}
                disabled={i === ids.length - 1}
               aria-label="Dolů">
                ↓
              </Button>
            </li>
          );
        })}
      </ol>
      <Button
        type="button"
        onClick={() => onResult(gradeCompositionPuzzle(pack, ids))}
      >
        Zkontrolovat kompozici
      </Button>
    </Shell>
  );
}

function QuoteDeviceActivity({
  pack,
  onResult,
}: {
  pack: MajExamPrepPack;
  onResult: (r: MajActivityResult) => void;
}) {
  const devices = useMemo(
    () =>
      shuffleIdsStable(
        pack.quoteDevices.map((q) => q.device),
        "dev-v1",
      ),
    [pack.quoteDevices],
  );
  const [mapping, setMapping] = useState<Record<string, string>>({});

  return (
    <Shell
      title={majActivityLabelsCs.quote_device}
      hint="Přiřaď citát ke správnému tropu / figuře / jazykovému prostředku."
    >
      <ul className="space-y-4">
        {pack.quoteDevices.map((q) => (
          <li key={q.id} className="space-y-2">
            <blockquote className="border-l-2 border-action pl-3 text-body-sm italic text-fg">
              „{q.quote}“
            </blockquote>
            <select
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm"
              value={mapping[q.id] ?? ""}
              onChange={(e) =>
                setMapping((m) => ({ ...m, [q.id]: e.target.value }))
              }
            >
              <option value="">— vyber prostředek —</option>
              {devices.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        onClick={() => onResult(gradeQuoteDeviceMatches(pack, mapping))}
      >
        Zkontrolovat citáty
      </Button>
    </Shell>
  );
}

function OralActivity({
  pack,
  activityId,
  onResult,
}: {
  pack: MajExamPrepPack;
  activityId: "summary_60s" | "oral_3min" | "full_oral";
  onResult: (r: MajActivityResult) => void;
}) {
  const challenge =
    activityId === "summary_60s"
      ? pack.summaryChallenge
      : activityId === "oral_3min"
        ? pack.oralThreeMin
        : pack.fullOralSimulation;

  const [answer, setAnswer] = useState("");
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(challenge.seconds);

  useEffect(() => {
    if (!running) return;
    if (left <= 0) {
      setRunning(false);
      return;
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [running, left]);

  function start() {
    setLeft(challenge.seconds);
    setRunning(true);
  }

  function submit() {
    setRunning(false);
    onResult(gradeTimedOral(pack, activityId, answer));
  }

  return (
    <Shell title={challenge.titleCs} hint={challenge.prompt}>
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={left <= 10 && running ? "danger" : "neutral"}>
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
        </Badge>
        {!running ? (
          <Button type="button" variant="secondary" onClick={start}>
            Start timer ({challenge.seconds}s)
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={() => setRunning(false)}>
            Pauza
          </Button>
        )}
      </div>
      <textarea
        className="min-h-40 w-full rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-fg"
        placeholder="Piš (nebo diktuj) ústní odpověď…"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />
      <Button type="button" onClick={submit} disabled={answer.trim().length < 8}>
        Odeslat a označit chybějící KU
      </Button>
    </Shell>
  );
}
