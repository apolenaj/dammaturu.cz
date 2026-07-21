import type { Metadata } from "next";
import { HomepageAnalyticsBeacon } from "@/components/analytics/homepage-analytics-beacon";
import { MarketingShell } from "@/components/shell/MarketingShell";
import {
  HomeCermat,
  HomeFaq,
  HomeFinalCta,
  HomeHero,
  HomeHowItWorks,
  HomeOralSimulation,
  HomeOwnMaterials,
  HomePricingPreview,
  HomeReadiness,
  HomeSuccessJourney,
  HomeTestingDemo,
  HomeUploadDemo,
  homeFaqItems,
} from "@/components/marketing/home/home-sections";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://dammaturu.cz";

const promise =
  "Nahraj, co se musíš naučit. My tě připravíme až k maturitě.";

export const metadata: Metadata = {
  title: {
    absolute: `DámMaturu.cz — ${promise}`,
  },
  description:
    "Nahraj poznámky a PDF. DámMaturu ti dá denní misi, procvičování z tvých textů, cvičný CERMAT a ústní nanečisto — až k maturitě z češtiny.",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: siteUrl,
    siteName: "DámMaturu.cz",
    title: `DámMaturu.cz — ${promise}`,
    description:
      "Materiály → denní mise → testy a ústní. Skutečná appka, ne chatbot.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DámMaturu.cz",
    description: promise,
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
        "Studijní systém k maturitě: nahrání materiálů, denní mise, procvičování, cvičný CERMAT a ústní nanečisto.",
      inLanguage: "cs-CZ",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CZK",
        description: "FREE · SMART · AI PRO · MATURITA MAX — entitlements v kódu",
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
      <HomeUploadDemo />
      <HomeTestingDemo />
      <HomeReadiness />
      <HomeCermat />
      <HomeOralSimulation />
      <HomeOwnMaterials />
      <HomeSuccessJourney />
      <HomePricingPreview />
      <HomeFaq />
      <HomeFinalCta />
    </MarketingShell>
  );
}
