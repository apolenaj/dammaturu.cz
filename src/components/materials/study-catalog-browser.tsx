"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  contentStatusLabelsCs,
  type StudyContentListItem,
  type StudyContentProgress,
} from "@/domain/study-content/registry";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const linkBtn =
  "inline-flex min-h-9 items-center justify-center rounded-md px-3.5 text-body-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus";
const linkPrimary = `${linkBtn} bg-action text-fg-on-brand hover:bg-action-hover`;
const linkOutline = `${linkBtn} border border-border bg-surface text-fg hover:bg-subtle`;
const linkGhost = `${linkBtn} text-fg-secondary hover:bg-subtle hover:text-fg`;

function statusTone(
  status: StudyContentListItem["contentStatus"],
): BadgeTone {
  switch (status) {
    case "available":
      return "success";
    case "available_with_warning":
      return "warning";
    case "unavailable":
      return "danger";
    default:
      return "neutral";
  }
}

export function StudyCatalogBrowser({
  subject,
  topics,
  materials,
  progressBySourceId,
}: {
  subject: string;
  topics: string[];
  materials: StudyContentListItem[];
  progressBySourceId: Record<string, StudyContentProgress>;
}) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | "">("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return materials.filter((m) => {
      if (topic && m.topic !== topic && m.subtopic !== topic) {
        if (!m.topics.includes(topic)) return false;
      }
      if (!q) return true;
      const hay = [m.title, m.topic, m.subtopic ?? "", m.originalFilename]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [materials, query, topic]);

  const topicOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of topics) set.add(t);
    for (const m of materials) {
      set.add(m.topic);
      if (m.subtopic) set.add(m.subtopic);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "cs"));
  }, [topics, materials]);

  return (
    <section className="space-y-4" aria-labelledby="catalog-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-overline text-action">Moje materiály · katalog</p>
          <h2
            id="catalog-heading"
            className="font-display text-title-md text-fg"
          >
            {subject}
          </h2>
          <p className="mt-1 text-body-sm text-fg-secondary">
            Studijní zdroje ČJL v aplikaci (směry, díla, lexikum). Učení ze
            zdroje — ne oficiální didaktický test CERMAT. Ten je v režimu{" "}
            <Link href="/app/cermat" className="font-semibold text-action">
              CERMAT příprava
            </Link>
            .
          </p>
        </div>
        <Badge tone="info">{filtered.length} materiálů</Badge>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            startTransition(() => setQuery(v));
          }}
          placeholder="Hledat materiál, téma…"
          aria-label="Hledat materiály"
          className="sm:max-w-xs"
        />
        <label className="flex min-w-0 flex-1 items-center gap-2 text-body-sm text-fg-secondary">
          <span className="shrink-0">Téma</span>
          <select
            className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-fg"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            aria-label="Filtrovat podle tématu"
          >
            <option value="">Všechna témata</option>
            {topicOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      {pending ? (
        <p className="text-caption text-fg-muted">Filtruji…</p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-6 text-body-sm text-fg-secondary">
          Žádný materiál neodpovídá filtru. Zkus jiné téma nebo vyhledávání.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((m) => {
            const progress = progressBySourceId[m.sourceId];
            const canOpen =
              m.contentStatus === "available" ||
              m.contentStatus === "available_with_warning";
            const continueHref = `/app/materials/katalog/${m.sourceId}${
              progress ? "?continue=1" : ""
            }`;
            return (
              <li key={m.sourceId}>
                <article
                  className={cn(
                    "rounded-xl border border-border bg-surface p-4 shadow-xs",
                    !canOpen && "opacity-80",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-semibold text-fg">
                        {canOpen ? (
                          <Link
                            href={`/app/materials/katalog/${m.sourceId}`}
                            className="hover:text-action"
                          >
                            {m.title}
                          </Link>
                        ) : (
                          m.title
                        )}
                      </h3>
                      <p className="mt-1 text-body-sm text-fg-secondary">
                        {m.topic}
                        {m.subtopic ? ` · ${m.subtopic}` : ""}
                      </p>
                      <p className="mt-1 text-caption text-fg-muted">
                        {m.originalFilename} · {m.chunkCount} úseků ·{" "}
                        {m.knowledgeUnitCount} jednotek
                      </p>
                      {progress ? (
                        <p className="mt-2 text-caption text-action">
                          Pokračovat — přečteno {progress.completedChunkIds.length}{" "}
                          úseků
                          {progress.quickTestAttempts > 0
                            ? ` · test ${progress.quickTestCorrect}/${progress.quickTestAttempts}`
                            : ""}
                        </p>
                      ) : null}
                      {m.unavailableReason ? (
                        <p className="mt-2 text-caption text-danger">
                          {m.unavailableReason}
                        </p>
                      ) : null}
                    </div>
                    <Badge tone={statusTone(m.contentStatus)}>
                      {contentStatusLabelsCs[m.contentStatus]}
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {canOpen ? (
                      <>
                        <Link href={continueHref} className={linkPrimary}>
                          {progress ? "Pokračovat" : "Otevřít"}
                        </Link>
                        <Link
                          href={`/app/materials/katalog/${m.sourceId}?mode=learn`}
                          className={linkOutline}
                        >
                          Začít učení
                        </Link>
                        <Link
                          href={`/app/materials/katalog/${m.sourceId}?mode=test`}
                          className={linkOutline}
                        >
                          Rychlý test
                        </Link>
                      </>
                    ) : (
                      <a
                        href={`/api/study-content/${m.sourceId}/original`}
                        className={linkOutline}
                      >
                        Zobrazit původní materiál
                      </a>
                    )}
                    <Link
                      href={`/app/materials/katalog/${m.sourceId}?mode=source`}
                      className={linkGhost}
                    >
                      Zdroj
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
