import type { Metadata } from "next";
import { HomepageAnalyticsBeacon } from "@/components/analytics/homepage-analytics-beacon";
import { MarketingShell } from "@/components/shell/MarketingShell";
import {
  HomeCzechContent,
  HomeFaq,
  HomeFinalCta,
  HomeFreeBeta,
  HomeHero,
  HomeHowItWorks,
  HomeMistakesReview,
  HomeProgressConcept,
  homeFaqItems,
} from "@/components/marketing/home/home-sections";
import { absoluteUrl, buildPublicMetadata, getSiteUrl } from "@/lib/seo";

const siteUrl = getSiteUrl();
const promise = "Víš, co se naučit. Víš, co už umíš.";

export const metadata: Metadata = {
  ...buildPublicMetadata({
    title: "DámMaturu.cz — maturita z češtiny bez chaosu",
    description:
      "Otázky, zpětná vazba ze zdroje, chyby k opakování a jasný pokrok. Víš, co se naučit — a co už umíš. Beta zdarma, bez registrace.",
    path: "/",
    ogTitle: `DámMaturu.cz — ${promise}`,
  }),
  title: {
    absolute: `DámMaturu.cz — ${promise}`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "DámMaturu.cz",
      description: promise,
      inLanguage: "cs-CZ",
    },
    {
      "@type": "SoftwareApplication",
      name: "DámMaturu",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description:
        "Studijní systém k maturitě z češtiny: otázky, zpětná vazba, chyby a pokrok. Beta zdarma.",
      inLanguage: "cs-CZ",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CZK",
        description: "Beta zdarma — placené plány zatím neprodáváme",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: homeFaqItems.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    },
    {
      "@type": "ItemList",
      name: "Příprava k maturitě — veřejná témata",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          url: absoluteUrl("/priprava"),
          name: "Příprava k maturitě z češtiny",
        },
        {
          "@type": "ListItem",
          position: 2,
          url: absoluteUrl("/priprava/narodni-obrozeni"),
          name: "Národní obrození",
        },
        {
          "@type": "ListItem",
          position: 3,
          url: absoluteUrl("/priprava/romantismus"),
          name: "Romantismus",
        },
      ],
    },
  ],
};

export default function HomePage() {
  return (
    <MarketingShell>
      <HomepageAnalyticsBeacon />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeHero />
      <HomeHowItWorks />
      <HomeMistakesReview />
      <HomeProgressConcept />
      <HomeCzechContent />
      <HomeFreeBeta />
      <HomeFaq />
      <HomeFinalCta />
    </MarketingShell>
  );
}
