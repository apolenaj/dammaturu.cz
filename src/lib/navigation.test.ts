import { describe, expect, it } from "vitest";
import {
  appPrimaryNav,
  appSecondaryNav,
  adminNav,
  isNavActive,
  publicNav,
  routeCatalog,
} from "@/lib/navigation";

describe("information architecture catalog", () => {
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
      "/app/plan",
      "/app/zachran-me",
      "/app/learn",
      "/app/topics",
      "/app/tests",
      "/app/review",
      "/app/mistakes",
      "/app/progress",
      "/app/progress/experiment",
      "/app/simulation",
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

  it("keeps primary nav at 5 items for mobile bottom bar", () => {
    expect(appPrimaryNav).toHaveLength(5);
    expect(appPrimaryNav.map((i) => i.label)).toEqual([
      "Dnes",
      "Učit se",
      "Opakovat",
      "Testy",
      "Pokrok",
    ]);
  });

  it("exposes secondary student destinations", () => {
    expect(appSecondaryNav.map((i) => i.label)).toEqual([
      "Plán",
      "Zachraň mě",
      "Témata",
      "Moje chyby",
      "Simulace",
      "Profil",
    ]);
  });

  it("has public and admin nav without dead hrefs", () => {
    const catalog = new Set(routeCatalog.map((r) => r.href));
    for (const item of [...publicNav, ...appPrimaryNav, ...appSecondaryNav, ...adminNav]) {
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
