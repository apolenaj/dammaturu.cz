import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  buildPublicMetadata,
  getSiteUrl,
  isPreviewHost,
  listPublicSitemapPaths,
  PRODUCTION_SITE_URL,
} from "@/lib/seo";
import {
  getPublicLearningPage,
  publicLearningPages,
} from "@/domain/seo/public-learning-pages";
import { homeFaqItems } from "@/components/marketing/home/home-sections";

describe("seo helpers", () => {
  it("uses production canonical host", () => {
    expect(getSiteUrl()).toBe(PRODUCTION_SITE_URL);
    expect(absoluteUrl("/priprava")).toBe(`${PRODUCTION_SITE_URL}/priprava`);
  });

  it("detects vercel preview hosts", () => {
    expect(isPreviewHost("my-app-git-main-team.vercel.app")).toBe(true);
    expect(isPreviewHost("https://dammaturu.cz")).toBe(false);
  });

  it("builds unique metadata with canonical + OG", () => {
    const meta = buildPublicMetadata({
      title: "Romantismus v české literatuře — znaky, autoři, maturita",
      description: "Romantismus k maturitě: cit, individualita, konflikt.",
      path: "/priprava/romantismus",
      type: "article",
      noIndex: false,
    });
    expect(meta.alternates?.canonical).toBe(
      `${PRODUCTION_SITE_URL}/priprava/romantismus`,
    );
    expect(meta.openGraph?.url).toBe(
      `${PRODUCTION_SITE_URL}/priprava/romantismus`,
    );
    expect(meta.description?.length).toBeLessThanOrEqual(160);
  });

  it("sitemap paths exclude private app surfaces", () => {
    const paths = listPublicSitemapPaths();
    expect(paths).toContain("/");
    expect(paths).toContain("/priprava");
    expect(paths).toContain("/priprava/narodni-obrozeni");
    expect(paths.every((p) => !p.startsWith("/app"))).toBe(true);
    expect(paths.every((p) => !p.startsWith("/admin"))).toBe(true);
  });
});

describe("public learning pages quality bar", () => {
  it("has unique slugs and seo titles", () => {
    const slugs = publicLearningPages.map((p) => p.slug);
    const titles = publicLearningPages.map((p) => p.seoTitle);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("every page has real intro + sections (not thin)", () => {
    for (const page of publicLearningPages) {
      expect(page.intro.length).toBeGreaterThan(80);
      expect(page.sections.length).toBeGreaterThanOrEqual(1);
      expect(page.description.length).toBeGreaterThan(40);
      expect(page.description.length).toBeLessThanOrEqual(160);
      const bodyLen = page.sections.reduce(
        (n, s) => n + s.body.join(" ").length,
        0,
      );
      expect(bodyLen).toBeGreaterThan(120);
    }
  });

  it("verified-backed literary pages exist for key clusters", () => {
    expect(getPublicLearningPage("narodni-obrozeni")?.verifiedBacked).toBe(
      true,
    );
    expect(getPublicLearningPage("romantismus")?.verifiedBacked).toBe(true);
    expect(getPublicLearningPage("maj")?.verifiedBacked).toBe(true);
  });

  it("keeps page count intentional (no mass thin set)", () => {
    expect(publicLearningPages.length).toBeGreaterThanOrEqual(10);
    expect(publicLearningPages.length).toBeLessThanOrEqual(20);
  });
});

describe("structured data shape (homepage FAQ)", () => {
  it("FAQ entries have question + answer strings", () => {
    expect(homeFaqItems.length).toBeGreaterThan(3);
    for (const item of homeFaqItems) {
      expect(item.q.length).toBeGreaterThan(5);
      expect(item.a.length).toBeGreaterThan(10);
    }
  });
});
