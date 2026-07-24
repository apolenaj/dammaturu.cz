import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("homepage conversion copy", () => {
  const page = readFileSync(
    path.join(process.cwd(), "src/app/page.tsx"),
    "utf8",
  );
  const landingDir = path.join(
    process.cwd(),
    "src/components/marketing/landing",
  );
  const landing = [
    "index.tsx",
    "landing-nav.tsx",
    "landing-hero.tsx",
    "landing-process.tsx",
    "landing-features.tsx",
    "landing-footer.tsx",
    "landing-ui.tsx",
  ]
    .map((f) => readFileSync(path.join(landingDir, f), "utf8"))
    .join("\n");

  it("leads with the product promise and free CTA", () => {
    expect(landing).toMatch(/Maturita\?\s*\{?/);
    expect(landing).toMatch(/Dám!/);
    expect(landing).toMatch(/Začít se učit zdarma/);
    expect(landing).toMatch(/Zdarma na vyzkoušení/);
    expect(landing).toMatch(/Jak to funguje/);
  });

  it("wires conversion sections around the dark landing", () => {
    expect(page).toContain("LandingPage");
    expect(landing).toContain("LandingHero");
    expect(landing).toContain("LandingProcess");
    expect(landing).toContain("LandingFeatures");
    expect(landing).toContain("LandingSmallFeatures");
    expect(landing).toContain("LandingAboutFooter");
    expect(landing).toContain("LandingFinalCta");
    expect(landing).toContain("LandingNav");
  });

  it("avoids internal jargon and fake conversion props", () => {
    expect(landing).not.toMatch(/\bmastery\b/i);
    expect(landing).not.toMatch(/\bprovenance\b/i);
    expect(landing).not.toMatch(/error loop/i);
    expect(landing).not.toMatch(/due reviews/i);
    expect(landing).not.toMatch(/Maturita Score/i);
    expect(landing).not.toMatch(/testimon/i);
    expect(landing).not.toMatch(/úspěšnost/i);
  });

  it("stays honest about free trial and payment", () => {
    expect(landing).toMatch(/Zdarma na vyzkoušení|Bez závazků/i);
    expect(landing).toMatch(/Nevyžadujeme platební kartu/);
    expect(landing).not.toMatch(/FREE · SMART · AI PRO/);
  });

  it("exports SEO metadata and FAQ JSON-LD", () => {
    expect(page).toContain("buildPublicMetadata");
    expect(page).toContain("application/ld+json");
    expect(page).toContain("homeFaqItems");
    expect(page).toContain("FAQPage");
  });
});
