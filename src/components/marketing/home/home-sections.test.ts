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

  it("includes required hero promise and CTAs", () => {
    expect(sections).toMatch(/Víš přesně, co se naučit/);
    expect(sections).toMatch(/Zjistit moji připravenost/);
    expect(sections).toMatch(/Jak to funguje/);
    expect(sections).not.toMatch(/AI parťák|AI chatbot|umělá inteligence jako/i);
  });

  it("wires all conversion sections", () => {
    for (const name of [
      "HomeHero",
      "HomeProblem",
      "HomeDiagnostics",
      "HomePlan",
      "HomeMethods",
      "HomeScore",
      "HomeWeakspots",
      "HomeReview",
      "HomeSimulation",
      "HomeDashboardShowcase",
      "HomeLessonShowcase",
      "HomeFaq",
      "HomeFinalCta",
    ]) {
      expect(page).toContain(name);
    }
  });

  it("exports SEO metadata", () => {
    expect(page).toContain("openGraph");
    expect(page).toContain("application/ld+json");
  });
});
