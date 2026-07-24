import { LandingAboutFooter, LandingFinalCta } from "./landing-footer";
import { LandingFeatures } from "./landing-features";
import { LandingHero } from "./landing-hero";
import { LandingNav } from "./landing-nav";
import {
  LandingProcess,
  LandingSmallFeatures,
} from "./landing-process";

export function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-[#070913] font-sans text-white antialiased">
      <LandingNav />
      <main id="main-content">
        <LandingHero />
        <LandingProcess />
        <LandingFeatures />
        <LandingSmallFeatures />
        <LandingAboutFooter />
        <LandingFinalCta />
      </main>
    </div>
  );
}

export { homeFaqItems } from "@/components/marketing/home/home-sections";
