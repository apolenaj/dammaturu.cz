import Link from "next/link";
import type { PublicLearningPage } from "@/domain/seo/public-learning-pages";
import { getRelatedPublicPages } from "@/domain/seo/public-learning-pages";

export function PublicLearningArticle({
  page,
}: {
  page: PublicLearningPage;
}) {
  const related = getRelatedPublicPages(page);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <nav aria-label="Drobečková navigace" className="text-caption text-fg-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-action hover:underline">
              Domů
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link
              href="/priprava"
              className="hover:text-action hover:underline"
            >
              Příprava
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-fg-secondary">{page.title}</li>
        </ol>
      </nav>

      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-action">
        {page.cluster}
        {page.verifiedBacked ? " · ověřený podklad" : ""}
      </p>
      <h1 className="mt-2 font-display text-display-sm font-semibold tracking-tight text-fg text-balance sm:text-display-md">
        {page.title}
      </h1>
      <p className="mt-4 text-body-lg leading-relaxed text-fg-secondary">
        {page.intro}
      </p>
      <p
        className="mt-3 rounded-lg border border-border bg-subtle/60 px-3 py-2 text-caption text-fg-muted"
        role="note"
      >
        {page.verificationNoteCs}
      </p>

      <div className="mt-10 space-y-10">
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-title-md tracking-tight text-fg">
              {section.heading}
            </h2>
            <div className="mt-3 space-y-3 text-body-md leading-relaxed text-fg-secondary">
              {section.body.map((para) => (
                <p key={para.slice(0, 48)}>{para}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href={page.ctaHref}
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-action px-6 text-body-sm font-semibold text-fg-on-brand shadow-xs transition hover:bg-action-hover"
        >
          {page.ctaLabel}
        </Link>
        <Link
          href="/priprava"
          className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-surface px-6 text-body-sm font-semibold text-fg transition hover:bg-subtle"
        >
          Všechna témata
        </Link>
      </div>

      {related.length > 0 ? (
        <aside className="mt-14 border-t border-border-subtle pt-8">
          <h2 className="font-display text-title-sm tracking-tight text-fg">
            Související témata
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/priprava/${r.slug}`}
                  className="block rounded-xl border border-border bg-surface px-4 py-3 transition hover:border-action/40"
                >
                  <span className="font-semibold text-fg">{r.title}</span>
                  <span className="mt-1 block text-caption text-fg-muted">
                    {r.cluster}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </article>
  );
}
