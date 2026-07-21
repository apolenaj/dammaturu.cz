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
  const previews = readFileSync(
    path.join(
      process.cwd(),
      "src/components/marketing/previews/product-previews.tsx",
    ),
    "utf8",
  );

  it("leads with the product promise", () => {
    expect(sections).toMatch(
      /Nahraj, co se musíš naučit\. My tě připravíme až k/,
    );
    expect(sections).toMatch(/Začít zdarma/);
    expect(sections).toMatch(/Jak to funguje/);
  });

  it("wires required marketing sections", () => {
    for (const name of [
      "HomeHero",
      "HomeHowItWorks",
      "HomeUploadDemo",
      "HomeTestingDemo",
      "HomeReadiness",
      "HomeCermat",
      "HomeOralSimulation",
      "HomeOwnMaterials",
      "HomeSuccessJourney",
      "HomePricingPreview",
      "HomeFaq",
      "HomeFinalCta",
    ]) {
      expect(page).toContain(name);
    }
  });

  it("avoids internal jargon on the homepage", () => {
    const blob = `${sections}\n${previews}`;
    expect(blob).not.toMatch(/\bmastery\b/i);
    expect(blob).not.toMatch(/\bprovenance\b/i);
    expect(blob).not.toMatch(/error loop/i);
    expect(blob).not.toMatch(/due reviews/i);
    expect(blob).not.toMatch(/Maturita Score/i);
  });

  it("stays honest about CERMAT and pricing", () => {
    expect(sections).toMatch(/cvičné/i);
    expect(sections).toMatch(/ne oficiální CERMAT|ne oficiální zadání/i);
    expect(sections).toMatch(/bez fiktivních cen|Veřejný ceník/i);
  });

  it("exports SEO metadata and FAQ JSON-LD", () => {
    expect(page).toContain("openGraph");
    expect(page).toContain("application/ld+json");
    expect(page).toContain("homeFaqItems");
  });
});
