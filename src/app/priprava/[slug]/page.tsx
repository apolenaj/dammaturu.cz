import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { PublicLearningArticle } from "@/components/marketing/public-learning-article";
import {
  getPublicLearningPage,
  publicLearningPages,
} from "@/domain/seo/public-learning-pages";
import { absoluteUrl, buildPublicMetadata, getSiteUrl } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return publicLearningPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getPublicLearningPage(slug);
  if (!page) return { title: "Téma nenalezeno" };
  return buildPublicMetadata({
    title: page.seoTitle,
    description: page.description,
    path: `/priprava/${page.slug}`,
    type: "article",
  });
}

export default async function PripravaTopicPage({ params }: Props) {
  const { slug } = await params;
  const page = getPublicLearningPage(slug);
  if (!page) notFound();

  const site = getSiteUrl();
  const url = absoluteUrl(`/priprava/${page.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: page.title,
        description: page.description,
        inLanguage: "cs-CZ",
        url,
        isPartOf: {
          "@type": "WebSite",
          name: "DámMaturu.cz",
          url: site,
        },
        about: page.cluster,
        educationalLevel: "secondary",
        learningResourceType: "overview",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Domů",
            item: site,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Příprava",
            item: absoluteUrl("/priprava"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: page.title,
            item: url,
          },
        ],
      },
    ],
  };

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicLearningArticle page={page} />
    </MarketingShell>
  );
}
