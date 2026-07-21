import type { Metadata } from "next";
import { MarketingShell } from "@/components/shell/MarketingShell";
import {
  HomeDashboardShowcase,
  HomeDiagnostics,
  HomeFaq,
  HomeFinalCta,
  HomeHero,
  HomeLessonShowcase,
  HomeMethods,
  HomePlan,
  HomeProblem,
  HomeReview,
  HomeScore,
  HomeSimulation,
  HomeWeakspots,
} from "@/components/marketing/home/home-sections";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://dammaturu.cz";

export const metadata: Metadata = {
  title: {
    absolute: "DámMaturu.cz — Víš, co se naučit. Víš, kdy jsi připraven.",
  },
  description:
    "DámMaturu promění maturitní učivo v konkrétní plán, procvičování, testy a opakování podle toho, co skutečně umíš. Diagnostika, mastery a Maturita Score.",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: siteUrl,
    siteName: "DámMaturu.cz",
    title: "DámMaturu.cz — Víš, co se naučit. Víš, kdy jsi připraven.",
    description:
      "Systém maturitní přípravy: diagnostika, osobní plán, active recall, opakování a Maturita Score. Ne chatbot.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DámMaturu.cz",
    description:
      "Víš přesně, co se naučit. A víš, kdy jsi připraven.",
  },
  robots: {
    index: true,
    follow: true,
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
      description:
        "Kompletní systém přípravy k maturitě — plán, procvičování, testy a Maturita Score.",
      inLanguage: "cs-CZ",
    },
    {
      "@type": "SoftwareApplication",
      name: "DámMaturu",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description:
        "Vzdělávací systém, který studentovi řekne, co se naučit, ověří znalosti a ukáže připravenost k maturitě.",
      inLanguage: "cs-CZ",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CZK",
        description: "Beta přístup řízený registrací",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Je DámMaturu chatbot s umělou inteligencí?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ne. Je to systém diagnostiky, plánu, procvičování, testů a opakování.",
          },
        },
        {
          "@type": "Question",
          name: "Odkud berete učivo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Z ověřených studijních materiálů s provenance.",
          },
        },
      ],
    },
  ],
};

export default function HomePage() {
  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeHero />
      <HomeProblem />
      <HomeDiagnostics />
      <HomePlan />
      <HomeMethods />
      <HomeScore />
      <HomeWeakspots />
      <HomeReview />
      <HomeSimulation />
      <HomeDashboardShowcase />
      <HomeLessonShowcase />
      <HomeFaq />
      <HomeFinalCta />
    </MarketingShell>
  );
}
