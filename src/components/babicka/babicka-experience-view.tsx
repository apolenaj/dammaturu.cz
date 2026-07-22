"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  babickaActivityIds,
  babickaActivityLabelsCs,
  babickaTopicLabelsCs,
  gradeCharacterCardQuiz,
  gradeOralBuilder,
  gradeRealismChallenge,
  gradeRelationshipMap,
  gradeStoryStructure,
  gradeTrueFalseTraps,
  shuffleBabickaIds,
  socialSphereLabelsCs,
  type BabickaActivityId,
  type BabickaActivityResult,
  type BabickaExperiencePack,
  type BabickaKu,
} from "@/domain/learning/babicka-experience";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function BabickaExperienceView({
  pack,
}: {
  pack: BabickaExperiencePack;
}) {
  const [activity, setActivity] =
    useState<BabickaActivityId>("character_cards");
  const [lastResult, setLastResult] = useState<BabickaActivityResult | null>(
    null,
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-2">
        <Badge tone="brand">Babička experience</Badge>
        <h1 className="font-display text-display-md text-fg">{pack.title}</h1>
        <p className="text-body-md text-fg-secondary">
          {pack.author} · {pack.subtitle}
        </p>
        <p className="text-caption text-fg-muted">
          {pack.knowledgeUnits.length} jednotek · karty / mapy / pasti — ne
          dlouhé odstavce
        </p>
      </header>

      <TopicStrip pack={pack} missing={lastResult?.missingKuSlugs ?? []} />

      <div
        role="tablist"
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
      >
        {babickaActivityIds.map((id) => (
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
            {babickaActivityLabelsCs[id]}
          </button>
        ))}
      </div>

      {activity === "character_cards" ? (
        <CharacterCards pack={pack} onResult={setLastResult} />
      ) : null}
      {activity === "relationship_map" ? (
        <RelationshipMap pack={pack} onResult={setLastResult} />
      ) : null}
      {activity === "true_false" ? (
        <TrueFalseTraps pack={pack} onResult={setLastResult} />
      ) : null}
      {activity === "story_structure" ? (
        <StoryStructure pack={pack} onResult={setLastResult} />
      ) : null}
      {activity === "realism_challenge" ? (
        <RealismChallenge pack={pack} onResult={setLastResult} />
      ) : null}
      {activity === "oral_builder" ? (
        <OralBuilder pack={pack} onResult={setLastResult} />
      ) : null}

      {lastResult ? <ResultPanel pack={pack} result={lastResult} /> : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href={pack.literaryWorkHref}
          className="text-body-sm font-semibold text-action hover:underline"
        >
          Plný rozbor →
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

function TopicStrip({
  pack,
  missing,
}: {
  pack: BabickaExperiencePack;
  missing: string[];
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {pack.knowledgeUnits.map((ku) => (
        <li key={ku.slug}>
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-1 text-caption font-semibold",
              missing.includes(ku.slug)
                ? "bg-danger/10 text-danger"
                : "bg-subtle text-fg-secondary",
            )}
            title={ku.cardLine}
          >
            {babickaTopicLabelsCs[ku.topic]}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ResultPanel({
  pack,
  result,
}: {
  pack: BabickaExperiencePack;
  result: BabickaActivityResult;
}) {
  const missing = result.missingKuSlugs
    .map((s) => pack.knowledgeUnits.find((k) => k.slug === s))
    .filter(Boolean) as BabickaKu[];

  return (
    <Alert
      tone={missing.length === 0 ? "success" : "warning"}
      title={
        missing.length === 0
          ? `Hotovo · ${result.scorePct}%`
          : `Chybějící KU (${missing.length}) · ${result.scorePct}%`
      }
    >
      <p className="text-body-sm">{result.noteCs}</p>
      {missing.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {missing.map((ku) => (
            <li key={ku.slug} className="text-body-sm">
              <strong>{ku.title}</strong>
              <span className="text-fg-secondary"> · {ku.cardLine}</span>
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
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-canvas px-4 py-4">
      <div>
        <h2 className="font-display text-xl text-fg">{title}</h2>
        <p className="mt-1 text-caption text-fg-muted">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function CharacterCards({
  pack,
  onResult,
}: {
  pack: BabickaExperiencePack;
  onResult: (r: BabickaActivityResult) => void;
}) {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [mapping, setMapping] = useState<Record<string, string>>({});

  return (
    <Shell
      title={babickaActivityLabelsCs.character_cards}
      hint="Klepni kartu → přiřaď sociální sféru."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {pack.characterCards.map((c) => {
          const open = flipped[c.id];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() =>
                setFlipped((f) => ({ ...f, [c.id]: !f[c.id] }))
              }
              className={cn(
                "rounded-xl border px-3 py-3 text-left transition",
                open
                  ? "border-action bg-action/5"
                  : "border-border bg-surface hover:border-action/40",
              )}
            >
              <p className="font-display text-body-md text-fg">{c.name}</p>
              {open ? (
                <div className="mt-2 space-y-2">
                  <p className="text-caption text-fg-secondary">{c.roleLine}</p>
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <Badge key={t} tone="neutral">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <select aria-label="Výběr přiřazení"
                    className="w-full rounded-md border border-border bg-canvas px-2 py-1.5 text-caption"
                    value={mapping[c.id] ?? ""}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      setMapping((m) => ({ ...m, [c.id]: e.target.value }));
                    }}
                  >
                    <option value="">— sféra —</option>
                    {(
                      Object.keys(socialSphereLabelsCs) as Array<
                        keyof typeof socialSphereLabelsCs
                      >
                    ).map((k) => (
                      <option key={k} value={k}>
                        {socialSphereLabelsCs[k]}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="mt-1 text-caption text-fg-muted">klepni</p>
              )}
            </button>
          );
        })}
      </div>
      <Button
        type="button"
        onClick={() => onResult(gradeCharacterCardQuiz(pack, mapping))}
      >
        Zkontrolovat karty
      </Button>
    </Shell>
  );
}

function RelationshipMap({
  pack,
  onResult,
}: {
  pack: BabickaExperiencePack;
  onResult: (r: BabickaActivityResult) => void;
}) {
  const nameOf = (id: string) =>
    pack.characterCards.find((c) => c.id === id)?.name ?? id;
  const labels = useMemo(
    () =>
      shuffleBabickaIds(
        pack.relationshipEdges.map((e) => e.label),
        "rel-v1",
      ),
    [pack.relationshipEdges],
  );
  const [mapping, setMapping] = useState<Record<string, string>>({});

  return (
    <Shell
      title={babickaActivityLabelsCs.relationship_map}
      hint="Spoj dvojice správným vztahem."
    >
      <ul className="space-y-3">
        {pack.relationshipEdges.map((e) => (
          <li
            key={e.id}
            className="flex flex-col gap-2 rounded-xl border border-border px-3 py-3 sm:flex-row sm:items-center"
          >
            <p className="min-w-0 flex-1 text-body-sm font-semibold text-fg">
              {nameOf(e.fromCharacterId)}
              <span className="mx-1 text-fg-muted">→</span>
              {nameOf(e.toCharacterId)}
            </p>
            <select aria-label="Výběr přiřazení"
              className="w-full rounded-md border border-border bg-surface px-2 py-2 text-caption sm:max-w-xs"
              value={mapping[e.id] ?? ""}
              onChange={(ev) =>
                setMapping((m) => ({ ...m, [e.id]: ev.target.value }))
              }
            >
              <option value="">— vztah —</option>
              {labels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        onClick={() => onResult(gradeRelationshipMap(pack, mapping))}
      >
        Zkontrolovat mapu
      </Button>
    </Shell>
  );
}

function TrueFalseTraps({
  pack,
  onResult,
}: {
  pack: BabickaExperiencePack;
  onResult: (r: BabickaActivityResult) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState(false);

  function submit() {
    setRevealed(true);
    onResult(gradeTrueFalseTraps(pack, answers));
  }

  return (
    <Shell
      title={babickaActivityLabelsCs.true_false}
      hint="Pozor na pasti — ne všechno „známé“ je pravda."
    >
      <ul className="space-y-3">
        {pack.trueFalseTraps.map((item) => {
          const chosen = answers[item.id];
          const wrong =
            revealed && chosen !== undefined && chosen !== item.isTrue;
          return (
            <li
              key={item.id}
              className={cn(
                "rounded-xl border px-3 py-3",
                wrong ? "border-danger/40 bg-danger/5" : "border-border",
              )}
            >
              <p className="text-body-sm text-fg">{item.claim}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={chosen === true ? "primary" : "outline"}
                  onClick={() =>
                    setAnswers((a) => ({ ...a, [item.id]: true }))
                  }
                >
                  Pravda
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={chosen === false ? "primary" : "outline"}
                  onClick={() =>
                    setAnswers((a) => ({ ...a, [item.id]: false }))
                  }
                >
                  Nepravda
                </Button>
              </div>
              {revealed && chosen !== item.isTrue ? (
                <p className="mt-2 text-caption text-warning">{item.trapHint}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Button type="button" onClick={submit}>
        Zkontrolovat pasti
      </Button>
    </Shell>
  );
}

function StoryStructure({
  pack,
  onResult,
}: {
  pack: BabickaExperiencePack;
  onResult: (r: BabickaActivityResult) => void;
}) {
  const [ids, setIds] = useState(() =>
    shuffleBabickaIds(
      pack.storyStructure.map((p) => p.id),
      "struct-v1",
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
      title={babickaActivityLabelsCs.story_structure}
      hint="Seřaď: prolog → pásma → epilog."
    >
      <ol className="space-y-2">
        {ids.map((id, i) => {
          const piece = pack.storyStructure.find((p) => p.id === id)!;
          return (
            <li
              key={id}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
            >
              <span className="w-6 text-caption font-bold text-fg-muted">
                {i + 1}
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
        onClick={() => onResult(gradeStoryStructure(pack, ids))}
      >
        Zkontrolovat strukturu
      </Button>
    </Shell>
  );
}

function RealismChallenge({
  pack,
  onResult,
}: {
  pack: BabickaExperiencePack;
  onResult: (r: BabickaActivityResult) => void;
}) {
  const [mapping, setMapping] = useState<
    Record<string, "realisticke" | "idealizovane">
  >({});
  const [revealed, setRevealed] = useState(false);

  function submit() {
    setRevealed(true);
    onResult(gradeRealismChallenge(pack, mapping));
  }

  return (
    <Shell
      title={babickaActivityLabelsCs.realism_challenge}
      hint="Každý řádek: realistické, nebo zidealizované?"
    >
      <ul className="space-y-3">
        {pack.realismChallenge.map((item) => {
          const pick = mapping[item.id];
          const wrong = revealed && pick && pick !== item.answer;
          return (
            <li
              key={item.id}
              className={cn(
                "rounded-xl border px-3 py-3",
                wrong ? "border-danger/40" : "border-border",
              )}
            >
              <p className="text-body-sm font-semibold text-fg">
                {item.statement}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={pick === "realisticke" ? "primary" : "outline"}
                  onClick={() =>
                    setMapping((m) => ({ ...m, [item.id]: "realisticke" }))
                  }
                >
                  Realistické
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={pick === "idealizovane" ? "accent" : "outline"}
                  onClick={() =>
                    setMapping((m) => ({ ...m, [item.id]: "idealizovane" }))
                  }
                >
                  Idealizované
                </Button>
              </div>
              {revealed && pick !== item.answer ? (
                <p className="mt-2 text-caption text-warning">{item.explain}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Button type="button" onClick={submit}>
        Zkontrolovat výzvu
      </Button>
    </Shell>
  );
}

function OralBuilder({
  pack,
  onResult,
}: {
  pack: BabickaExperiencePack;
  onResult: (r: BabickaActivityResult) => void;
}) {
  const [answer, setAnswer] = useState("");
  const chips = pack.oralBuilder.builderChips;

  function addChip(chip: string) {
    setAnswer((a) => (a.trim() ? `${a.trim()} ${chip}` : chip));
  }

  return (
    <Shell
      title={pack.oralBuilder.titleCs}
      hint={pack.oralBuilder.prompt}
    >
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => addChip(chip)}
            className="rounded-md bg-subtle px-2.5 py-1.5 text-caption font-semibold text-fg-secondary ring-1 ring-border hover:bg-action/10 hover:text-action"
          >
            + {chip}
          </button>
        ))}
      </div>
      <textarea
        className="min-h-36 w-full rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-fg"
        placeholder="Skládej odpověď z chipů + vlastních slov…"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />
      <Button
        type="button"
        onClick={() => onResult(gradeOralBuilder(pack, answer))}
        disabled={answer.trim().length < 12}
      >
        Odeslat a označit chybějící KU
      </Button>
    </Shell>
  );
}
