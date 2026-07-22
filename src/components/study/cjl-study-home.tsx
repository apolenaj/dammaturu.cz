import Link from "next/link";
import type { CjlHomeView, TopicCardModel } from "@/domain/study-content/cjl-home";
import { progressDetailCs } from "@/domain/study-content/cjl-home";
import { cn } from "@/lib/cn";

/**
 * Mobile-first ČJL entry — one subject, one next step, real topic cards.
 * No fabricated readiness scores.
 */
export function CjlStudyHome({ view }: { view: CjlHomeView }) {
  return (
    <div className="mx-auto w-full max-w-lg pb-8">
      <header className="relative overflow-hidden rounded-b-[1.75rem] px-1 pb-6 pt-2">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_10%_0%,rgba(34,120,92,0.14),transparent_55%),radial-gradient(90%_70%_at_100%_20%,rgba(196,140,60,0.12),transparent_50%)]"
          aria-hidden
        />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-action">
          Předmět
        </p>
        <h1 className="mt-2 font-display text-[1.85rem] font-semibold leading-[1.1] tracking-tight text-fg sm:text-[2.15rem]">
          Český jazyk
          <span className="block text-fg-secondary">a literatura</span>
        </h1>
        <p className="mt-3 max-w-sm text-body-sm text-fg-secondary">
          Jedna obrazovka: co teď, co máš k dispozici, kde jsi slabý/á a kolik už
          máš hotovo.
        </p>
      </header>

      {/* 1. What now */}
      <section
        aria-labelledby="cjl-now"
        className="mt-2 rounded-2xl bg-fg px-5 py-5 text-fg-inverse shadow-sm"
      >
        <p
          id="cjl-now"
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-inverse/55"
        >
          Co teď
        </p>
        {view.isFirstTime ? (
          <p className="mt-2 inline-flex rounded-md bg-accent/90 px-2.5 py-1 text-caption font-semibold text-fg">
            Začni tady
          </p>
        ) : null}
        <h2 className="mt-2 font-display text-xl font-semibold leading-snug tracking-tight">
          {view.now.titleCs}
        </h2>
        <p className="mt-1.5 text-body-sm text-fg-inverse/70">
          {view.now.detailCs}
        </p>
        <Link
          href={view.now.href}
          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-action px-4 text-body-sm font-semibold text-fg-on-brand transition hover:bg-action-hover active:scale-[0.985]"
        >
          {view.isFirstTime ? "Začni tady" : "Pokračovat v učení"}
        </Link>
      </section>

      {/* Answers 2–4 */}
      <section
        aria-label="Stav přípravy"
        className="mt-5 grid grid-cols-1 gap-3"
      >
        <StatusRow
          label="Materiály"
          value={`${view.materialsAvailable} připravených`}
          href="/app/materials"
        />
        <StatusRow
          label="Slabiny"
          value={view.weakLabelCs}
          href={view.weakHref}
        />
        <StatusRow
          label="Hotovo"
          value={progressDetailCs(view.completedChunks, view.totalChunks)}
          href={null}
        />
      </section>

      {/* Fast actions — only live destinations */}
      <section className="mt-6" aria-labelledby="cjl-fast">
        <h2
          id="cjl-fast"
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted"
        >
          Rychlé akce
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {view.fastActions.map((a) => (
            <li key={a.id}>
              <Link
                href={a.href}
                className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-4 text-body-sm font-semibold text-fg transition hover:border-action/40 hover:bg-subtle active:scale-[0.985]"
              >
                {a.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Topic cards from registry */}
      <section className="mt-8" aria-labelledby="cjl-topics">
        <div className="flex items-end justify-between gap-3">
          <h2
            id="cjl-topics"
            className="font-display text-xl font-semibold tracking-tight text-fg"
          >
            Témata
          </h2>
          <p className="text-caption text-fg-muted">
            {view.topics.length} skupin
          </p>
        </div>
        <ul className="mt-4 space-y-3">
          {view.topics.length === 0 ? (
            <li className="rounded-2xl border border-border bg-surface px-4 py-5 text-body-sm text-fg-secondary">
              Témata se načítají z katalogu. Zkus{" "}
              <Link href="/app/materials" className="font-semibold text-action">
                Moje materiály
              </Link>
              .
            </li>
          ) : (
            view.topics.map((topic) => (
              <li key={topic.topicId}>
                <TopicCard topic={topic} />
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function StatusRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string | null;
}) {
  const inner = (
    <>
      <span className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
        {label}
      </span>
      <span className="mt-0.5 block text-body-sm font-semibold text-fg">
        {value}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-border/80 bg-surface/90 px-4 py-3 transition hover:border-action/35"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-border/80 bg-surface/90 px-4 py-3">
      {inner}
    </div>
  );
}

function TopicCard({ topic }: { topic: TopicCardModel }) {
  return (
    <article className="rounded-2xl border border-border bg-surface px-4 py-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-snug text-fg">
            {topic.topicName}
          </h3>
          <p className="mt-1 text-caption text-fg-muted">
            {topic.materialCount}{" "}
            {topic.materialCount === 1 ? "materiál" : "materiálů"} ·{" "}
            {topic.studyUnitCount} studijních jednotek
          </p>
        </div>
      </div>

      <dl className="mt-3 space-y-1.5 text-body-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-fg-muted">Pokrok</dt>
          <dd className="text-right font-medium text-fg">
            {progressDetailCs(topic.completedChunks, topic.chunkCount)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-fg-muted">Jistota</dt>
          <dd
            className={cn(
              "text-right font-medium",
              topic.mastery.kind === "insufficient"
                ? "text-fg-muted"
                : "text-fg",
            )}
          >
            {topic.mastery.labelCs}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-fg-muted">K procvičení</dt>
          <dd className="text-right font-medium text-fg">
            {topic.dueForReviewCount === 0
              ? "Nic nečeká"
              : `${topic.dueForReviewCount} ${
                  topic.dueForReviewCount === 1 ? "materiál" : "materiály"
                }`}
          </dd>
        </div>
      </dl>

      <Link
        href={topic.primaryCta.href}
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl bg-action px-4 text-body-sm font-semibold text-fg-on-brand transition hover:bg-action-hover active:scale-[0.985]"
      >
        {topic.primaryCta.label}
      </Link>
    </article>
  );
}
