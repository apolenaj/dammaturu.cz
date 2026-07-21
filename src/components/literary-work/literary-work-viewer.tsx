"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  literaryWorkSectionIds,
  literaryWorkSectionLabelsCs,
  sectionTitleCs,
  type LiteraryBlock,
  type LiteraryWork,
  type LiteraryWorkSectionId,
} from "@/domain/learning/literary-work";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function LiteraryWorkViewer({ work }: { work: LiteraryWork }) {
  const [active, setActive] = useState<LiteraryWorkSectionId>("quick_grasp");
  const section = useMemo(
    () => work.sections.find((s) => s.id === active) ?? work.sections[0]!,
    [work.sections, active],
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-2">
        <Badge tone="brand">Literární dílo</Badge>
        <h1 className="font-display text-display-md text-fg">{work.title}</h1>
        <p className="text-body-md text-fg-secondary">
          {work.author}
          {work.yearPublished ? ` · ${work.yearPublished}` : ""} · {work.workType}{" "}
          · {work.movement}
        </p>
        <p className="text-body-sm text-fg-secondary">{work.summary}</p>
      </header>

      <div
        role="tablist"
        aria-label="Sekce rozboru"
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
      >
        {literaryWorkSectionIds.map((id) => {
          const on = id === active;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(id)}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-caption font-semibold transition",
                on
                  ? "bg-surface text-fg shadow-xs ring-1 ring-border"
                  : "bg-subtle text-fg-secondary hover:text-fg",
              )}
            >
              {literaryWorkSectionLabelsCs[id]}
            </button>
          );
        })}
      </div>

      <section
        role="tabpanel"
        aria-label={sectionTitleCs(section)}
        className="space-y-4 rounded-2xl border border-border bg-canvas px-4 py-5"
      >
        <div>
          <h2 className="font-display text-xl text-fg">
            {sectionTitleCs(section)}
          </h2>
          {section.summaryCs ? (
            <p className="mt-1 text-body-sm text-fg-secondary">
              {section.summaryCs}
            </p>
          ) : null}
        </div>
        <div className="space-y-4">
          {section.blocks.map((block, i) => (
            <BlockView key={`${section.id}-${i}`} block={block} />
          ))}
        </div>
      </section>

      <RelatedLinks work={work} />
    </div>
  );
}

function RelatedLinks({ work }: { work: LiteraryWork }) {
  const r = work.related;
  const links = [
    r.reconstructionHref && { href: r.reconstructionHref, label: "Rekonstrukce děje" },
    r.teachBackHref && { href: r.teachBackHref, label: "Nauč zpátky" },
    r.testHref && { href: r.testHref, label: "Otázky" },
    r.quickGraspHref && { href: r.quickGraspHref, label: "Rychle pochopit (pack)" },
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="inline-flex min-h-10 items-center rounded-md border border-border px-3 text-body-sm font-semibold text-fg hover:border-action/40"
        >
          {l.label}
        </Link>
      ))}
      <Link
        href={`/app/topics?focus=${encodeURIComponent(r.curriculumTopicSlug)}`}
        className="inline-flex min-h-10 items-center rounded-md border border-border px-3 text-body-sm font-semibold text-fg hover:border-action/40"
      >
        Kurikulum
      </Link>
    </div>
  );
}

function BlockView({ block }: { block: LiteraryBlock }) {
  switch (block.type) {
    case "paragraph":
      return <p className="text-body-md text-fg">{block.text}</p>;
    case "bullets":
      return (
        <ul className="list-disc space-y-1 pl-5 text-body-md text-fg">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <Alert
          title={block.title}
          tone={
            block.tone === "brand"
              ? "info"
              : block.tone === "success"
                ? "success"
                : block.tone === "warning"
                  ? "warning"
                  : "info"
          }
        >
          {block.body}
        </Alert>
      );
    case "key_value":
      return (
        <dl className="grid gap-2 sm:grid-cols-2">
          {block.pairs.map((p) => (
            <div
              key={p.label}
              className="rounded-lg border border-border bg-subtle/40 px-3 py-2"
            >
              <dt className="text-caption font-semibold uppercase tracking-wider text-fg-muted">
                {p.label}
              </dt>
              <dd className="mt-0.5 text-body-sm text-fg">{p.value}</dd>
            </div>
          ))}
        </dl>
      );
    case "character":
      return (
        <div className="rounded-xl border border-border px-3 py-3">
          <p className="font-display text-lg text-fg">{block.name}</p>
          <p className="text-body-sm text-fg-secondary">{block.role}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {block.traits.map((t) => (
              <li key={t}>
                <Badge tone="neutral">{t}</Badge>
              </li>
            ))}
          </ul>
        </div>
      );
    case "quiz":
      return <QuizBlock block={block} />;
    case "oral_prompt":
      return (
        <div className="rounded-xl border border-action/30 bg-action/5 px-3 py-3">
          <p className="font-medium text-fg">{block.prompt}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-body-sm text-fg-secondary">
            {block.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      );
    case "link_cta":
      return (
        <Link
          href={block.href}
          className="inline-flex min-h-11 items-center rounded-md bg-action px-4 text-body-sm font-semibold text-fg-on-brand"
        >
          {block.label}
        </Link>
      );
    default:
      return null;
  }
}

function QuizBlock({
  block,
}: {
  block: Extract<LiteraryBlock, { type: "quiz" }>;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const revealed = picked != null;
  const correct = picked === block.correctIndex;

  return (
    <div className="space-y-3 rounded-xl border border-border px-3 py-3">
      <p className="font-medium text-fg">{block.question}</p>
      <div className="space-y-2">
        {block.options.map((opt, i) => {
          const selected = picked === i;
          const showCorrect = revealed && i === block.correctIndex;
          const showWrong = revealed && selected && !correct;
          return (
            <button
              key={opt}
              type="button"
              disabled={revealed}
              onClick={() => setPicked(i)}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-left text-body-sm transition",
                showCorrect && "border-success bg-success-soft/40",
                showWrong && "border-danger bg-danger-soft/30",
                !revealed && "border-border hover:border-action/40",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {revealed ? (
        <>
          <p className="text-body-sm text-fg-secondary">{block.explanation}</p>
          <Button variant="ghost" onClick={() => setPicked(null)}>
            Zkusit znovu
          </Button>
        </>
      ) : null}
    </div>
  );
}
