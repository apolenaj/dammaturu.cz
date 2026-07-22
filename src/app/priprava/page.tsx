import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/shell/MarketingShell";
import {
  publicLearningHub,
  publicLearningPages,
} from "@/domain/seo/public-learning-pages";
import { absoluteUrl, buildPublicMetadata, getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = buildPublicMetadata({
  title: publicLearningHub.seoTitle,
  description: publicLearningHub.description,
  path: "/priprava",
});

const clusters = Array.from(
  new Set(publicLearningPages.map((p) => p.cluster)),
);

export default function PripravaHubPage() {
  const site = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: publicLearningHub.title,
    description: publicLearningHub.description,
    url: absoluteUrl("/priprava"),
    isPartOf: { "@type": "WebSite", name: "DámMaturu.cz", url: site },
    inLanguage: "cs-CZ",
    hasPart: publicLearningPages.map((p) => ({
      "@type": "WebPage",
      name: p.title,
      url: absoluteUrl(`/priprava/${p.slug}`),
      description: p.description,
    })),
  };

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-action">
          Veřejná příprava
        </p>
        <h1 className="mt-2 font-display text-display-sm font-semibold tracking-tight text-fg text-balance sm:text-display-md">
          {publicLearningHub.title}
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg text-fg-secondary">
          {publicLearningHub.description}
        </p>
        <p className="mt-3 text-body-sm text-fg-muted">
          Žádné tenké AI stránky. Jen témata s reálnou hodnotou pro studenta —
          u literárních faktů s vazbou na ověřený obsah.
        </p>

        <div className="mt-10 space-y-10">
          {clusters.map((cluster) => (
            <section key={cluster} aria-labelledby={`cluster-${cluster}`}>
              <h2
                id={`cluster-${cluster}`}
                className="font-display text-title-md tracking-tight text-fg"
              >
                {cluster}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {publicLearningPages
                  .filter((p) => p.cluster === cluster)
                  .map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/priprava/${p.slug}`}
                        className="block h-full rounded-2xl border border-border bg-surface px-4 py-4 shadow-xs transition hover:border-action/35"
                      >
                        <span className="font-display text-lg font-semibold text-fg">
                          {p.title}
                        </span>
                        <span className="mt-2 block text-body-sm text-fg-secondary">
                          {p.description}
                        </span>
                        {p.verifiedBacked ? (
                          <span className="mt-2 inline-block text-caption font-semibold text-action">
                            Ověřený podklad
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-12 text-body-sm text-fg-secondary">
          Chceš denní misi a procvičování?{" "}
          <Link href="/app/learn" className="font-semibold text-action underline">
            Začni se učit zdarma
          </Link>
          {" · "}
          <Link
            href="/maturitni-priprava"
            className="font-semibold text-action underline"
          >
            Jak připravujeme na maturitu
          </Link>
        </p>
      </div>
    </MarketingShell>
  );
}
