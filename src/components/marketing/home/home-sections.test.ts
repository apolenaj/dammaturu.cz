import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("homepage conversion copy", () => {
  const page = readFileSync(
    path.join(process.cwd(), "src/app/page.tsx"),
    "utf8",
  );
  const sections = readFileSync(
    path.join(process.cwd(), "src/components/marketing/home/home-sections.tsx"),
    "utf8",
  );
  const preview = readFileSync(
    path.join(
      process.cwd(),
      "src/components/marketing/interactive-learning-preview.tsx",
    ),
    "utf8",
  );

  it("leads with the product promise and free CTA", () => {
    expect(sections).toMatch(/Víš, co se naučit\. Víš, co už/);
    expect(sections).toMatch(/Začít se učit zdarma/);
    expect(sections).toMatch(/Bez registrace\. Začni během pár sekund\./);
    expect(sections).toMatch(/Jak to funguje/);
  });

  it("wires conversion sections around real usage", () => {
    for (const name of [
      "HomeHero",
      "HomeHowItWorks",
      "HomeMistakesReview",
      "HomeProgressConcept",
      "HomeCzechContent",
      "HomeFreeBeta",
      "HomeFaq",
      "HomeFinalCta",
    ]) {
      expect(page).toContain(name);
    }
    expect(page).not.toContain("HomePricingPreview");
    expect(page).not.toContain("HomeUploadDemo");
    expect(sections).toContain("InteractiveLearningPreview");
    expect(preview).toContain("publicPreviewItems");
  });

  it("avoids internal jargon and fake conversion props", () => {
    expect(sections).not.toMatch(/\bmastery\b/i);
    expect(sections).not.toMatch(/\bprovenance\b/i);
    expect(sections).not.toMatch(/error loop/i);
    expect(sections).not.toMatch(/due reviews/i);
    expect(sections).not.toMatch(/Maturita Score/i);
    expect(sections).not.toMatch(/testimon/i);
    expect(sections).not.toMatch(/úspěšnost/i);
  });

  it("stays honest about free beta and CERMAT", () => {
    expect(sections).toMatch(/Beta je zdarma|beta zdarma/i);
    expect(sections).toMatch(/cvičné/i);
    expect(sections).toMatch(/ne jako oficiální|ne oficiální/i);
    expect(sections).not.toMatch(/FREE · SMART · AI PRO/);
    expect(page).toMatch(/Beta zdarma/);
  });

  it("exports SEO metadata and FAQ JSON-LD", () => {
    expect(page).toContain("buildPublicMetadata");
    expect(page).toContain("application/ld+json");
    expect(page).toContain("homeFaqItems");
    expect(page).toContain("FAQPage");
  });
});
