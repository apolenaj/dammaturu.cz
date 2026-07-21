import { describe, expect, it } from "vitest";
import {
  appPrimaryNav,
  appSecondaryNav,
  adminNav,
  filterReadyNav,
  getVisibleAdminNav,
  getVisiblePrimaryNav,
  getVisibleSecondaryNav,
  isNavActive,
  publicNav,
  routeCatalog,
} from "@/lib/navigation";

describe("information architecture catalog", () => {
  it("never exposes npm seed / CLI hints in learner-facing nextStep", () => {
    for (const meta of routeCatalog) {
      expect(meta.nextStep).not.toMatch(/npm run seed/i);
      expect(meta.nextStep).not.toMatch(/npx tsx/i);
      expect(meta.nextStep).not.toMatch(/STRIPE_\*/);
    }
  });

  it("covers required public routes", () => {
    const hrefs = routeCatalog.map((r) => r.href);
    for (const href of [
      "/",
      "/jak-to-funguje",
      "/predmety",
      "/maturitni-priprava",
      "/cenik",
      "/o-projektu",
      "/prihlaseni",
      "/registrace",
      "/onboarding",
    ]) {
      expect(hrefs).toContain(href);
    }
  });

  it("covers required app routes", () => {
    const hrefs = routeCatalog.map((r) => r.href);
    for (const href of [
      "/app/dashboard",
      "/app/materials",
      "/app/plan",
      "/app/exam-profile",
      "/app/literature",
      "/app/zachran-me",
      "/app/learn",
      "/app/topics",
      "/app/tests",
      "/app/review",
      "/app/mistakes",
      "/app/progress",
      "/app/progress/experiment",
      "/app/simulation",
      "/app/cermat",
      "/app/profile",
    ]) {
      expect(hrefs).toContain(href);
    }
  });

  it("covers required admin routes", () => {
    const hrefs = routeCatalog.map((r) => r.href);
    for (const href of [
      "/admin/content",
      "/admin/sources",
      "/admin/questions",
      "/admin/users",
      "/admin/reviews",
      "/admin/analytics",
    ]) {
      expect(hrefs).toContain(href);
    }
  });

  it("keeps primary JTBD nav at 5 items for mobile bottom bar", () => {
    expect(appPrimaryNav).toHaveLength(5);
    expect(appPrimaryNav.map((i) => i.label)).toEqual([
      "Dnes",
      "Učit se",
      "Moje materiály",
      "Testy",
      "Pokrok",
    ]);
    expect(getVisiblePrimaryNav()).toHaveLength(5);
  });

  it("exposes secondary JTBD destinations only", () => {
    expect(appSecondaryNav.map((i) => i.label)).toEqual([
      "Opakování",
      "Moje chyby",
      "Plán",
      "Zkouška nanečisto",
      "Profil",
    ]);
    expect(getVisibleSecondaryNav()).toHaveLength(5);
  });

  it("never surfaces non-ready destinations in chrome", () => {
    const visible = [
      ...getVisiblePrimaryNav(),
      ...getVisibleSecondaryNav(),
      ...getVisibleAdminNav(),
    ];
    for (const item of visible) {
      const meta = routeCatalog.find((r) => r.href === item.href);
      expect(meta?.availability).toBe("ready");
    }
    expect(filterReadyNav(adminNav).some((i) => i.href === "/admin/users")).toBe(
      false,
    );
    expect(
      filterReadyNav(adminNav).some((i) => i.href === "/admin/questions"),
    ).toBe(false);
  });

  it("has public and admin nav without dead hrefs", () => {
    const catalog = new Set(routeCatalog.map((r) => r.href));
    for (const item of [
      ...publicNav,
      ...appPrimaryNav,
      ...appSecondaryNav,
      ...adminNav,
    ]) {
      expect(catalog.has(item.href)).toBe(true);
    }
  });
});

describe("isNavActive", () => {
  it("matches exact paths", () => {
    expect(isNavActive("/app/learn", "/app/learn")).toBe(true);
    expect(isNavActive("/app/learn", "/app/review")).toBe(false);
  });

  it("matches nested paths but not siblings", () => {
    expect(isNavActive("/app/learn/session/1", "/app/learn")).toBe(true);
    expect(isNavActive("/app/learning", "/app/learn")).toBe(false);
  });

  it("treats home specially", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/jak-to-funguje", "/")).toBe(false);
  });
});
