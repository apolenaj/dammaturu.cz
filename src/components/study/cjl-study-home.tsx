import Link from "next/link";
import type { CjlHomeView, TopicCardModel } from "@/domain/study-content/cjl-home";
import { progressDetailCs } from "@/domain/study-content/cjl-home";
import { TopicCard } from "@/components/ui/topic-card";
import type { StudentVisualState } from "@/domain/learning/mastery-engine";

/**
 * Mobile-first ČJL entry — one subject, one next step, consistent topic cards.
 */
export function CjlStudyHome({ view }: { view: CjlHomeView }) {
  return (
    <div className="mx-auto w-full max-w-lg space-y-8 pb-8">
      <header className="space-y-3 px-1 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-action">
          Předmět
        </p>
        <h1 className="font-display text-[1.85rem] font-semibold leading-[1.1] tracking-tight text-fg text-balance sm:text-[2.15rem]">
          Český jazyk
          <span className="block text-fg-secondary">a literatura</span>
        </h1>
        <p className="max-w-sm text-body-sm text-fg-secondary">
          Jedna obrazovka: co teď, co máš k dispozici a kde jsi.
        </p>
      </header>

      {/* 1. What now — calm surface, one primary CTA */}
      <section
        aria-labelledby="cjl-now"
        className="rounded-2xl border border-border bg-surface px-5 py-5 shadow-xs"
      >
        <p
          id="cjl-now"
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted"
        >
          Co teď
        </p>
        {view.isFirstTime ? (
          <p className="mt-2 inline-flex rounded-md bg-action-soft px-2.5 py-1 text-caption font-semibold text-action">
            Začni tady
          </p>
        ) : null}
        <h2 className="mt-2 font-display text-xl font-semibold leading-snug tracking-tight text-fg">
          {view.now.titleCs}
        </h2>
        <p className="mt-1.5 text-body-sm text-fg-secondary">
          {view.now.detailCs}
        </p>
        <Link
          href={view.now.href}
          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-action px-4 text-body-sm font-semibold tracking-wide text-fg-on-brand shadow-xs transition duration-fast ease-out hover:bg-action-hover hover:shadow-sm active:scale-[0.985]"
        >
          {view.isFirstTime ? "Začni tady" : "Pokračovat v učení"}
        </Link>
      </section>

      <section
        aria-label="Stav přípravy"
        className="grid grid-cols-1 gap-2.5"
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

      <section aria-labelledby="cjl-fast">
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
                className="inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-4 text-body-sm font-semibold text-fg transition duration-fast hover:border-action/40 hover:bg-subtle active:scale-[0.985]"
              >
                {a.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cjl-topics">
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
                <CjlTopicCard topic={topic} />
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
        className="block rounded-xl border border-border bg-surface px-4 py-3 transition hover:border-action/35"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      {inner}
    </div>
  );
}

function visualForTopic(topic: TopicCardModel): StudentVisualState {
  if (topic.mastery.kind === "insufficient") {
    return topic.dueForReviewCount > 0 ? "needs_review" : "new";
  }
  const ratio = topic.mastery.correct / Math.max(1, topic.mastery.attempts);
  if (ratio >= 0.8) return "strong";
  if (ratio >= 0.5) return "learning";
  return "needs_review";
}

function CjlTopicCard({ topic }: { topic: TopicCardModel }) {
  const dueCs =
    topic.dueForReviewCount === 0
      ? "Nic nečeká"
      : `${topic.dueForReviewCount} ${
          topic.dueForReviewCount === 1 ? "materiál" : "materiály"
        }`;

  return (
    <TopicCard
      title={topic.topicName}
      metaCs={`${topic.materialCount} ${
        topic.materialCount === 1 ? "materiál" : "materiálů"
      } · ${topic.studyUnitCount} studijních jednotek`}
      progressCs={progressDetailCs(topic.completedChunks, topic.chunkCount)}
      dueCs={dueCs}
      visualState={visualForTopic(topic)}
      ctaLabel={topic.primaryCta.label}
      ctaHref={topic.primaryCta.href}
    >
      <p className="mt-3 text-caption text-fg-muted">{topic.mastery.labelCs}</p>
    </TopicCard>
  );
}
