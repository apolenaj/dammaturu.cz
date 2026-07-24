import type { Metadata } from "next";
import { HomepageAnalyticsBeacon } from "@/components/analytics/homepage-analytics-beacon";
import { LandingPage } from "@/components/marketing/landing";
import { homeFaqItems } from "@/components/marketing/home/home-sections";
import { absoluteUrl, buildPublicMetadata, getSiteUrl } from "@/lib/seo";

const siteUrl = getSiteUrl();
const promise = "Maturita? Dám!";

export const metadata: Metadata = {
  ...buildPublicMetadata({
    title: "DámMaturu.cz — #1 AI studijní systém pro maturitu",
    description:
      "Chytré učení, které se přizpůsobí tobě. Nahraj své materiály nebo použij naše a my tě dovedeme k úspěchu. Zdarma na vyzkoušení.",
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
        "AI studijní systém k maturitě: materiály, chytré učení, pokrok a motivace. Zdarma na vyzkoušení.",
      inLanguage: "cs-CZ",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CZK",
        description: "Zdarma na vyzkoušení — nevyžadujeme platební kartu",
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
    <>
      <HomepageAnalyticsBeacon />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
