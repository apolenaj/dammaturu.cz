import { expect, test, type Page } from "@playwright/test";
import {
  answerLearningSessionSteps,
  waitForLearningSessionReady,
} from "./helpers/learning-session";

/**
 * P0 release readiness — anonymous guest golden path.
 * Fresh storage (incognito-like). Desktop + mobile projects.
 *
 * Mandatory path: homepage → ČJL → materials → learn session → 5 answers →
 * mistake → Moje chyby → reload → second topic quick test → progress.
 */

async function assertNoAuthWall(page: Page) {
  await expect(page).not.toHaveURL(/prihlaseni|registrace/i);
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/npm run seed/i);
  expect(body).not.toMatch(/spusť seed/i);
}

async function assertNoConsoleBreakers(page: Page, errors: string[]) {
  // Soft: collect only pageerror; ignore benign network noise
  expect(
    errors.filter((e) => !/favicon|hydration|ResizeObserver/i.test(e)),
  ).toEqual([]);
}

test.describe("P0 tomorrow-ready guest golden path", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("desktop: full anonymous study path", async ({ page, context }) => {
    test.setTimeout(240_000);
    await context.clearCookies();
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // 1–2. Homepage + CTA without registration
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 25_000,
    });
    const cta = page.getByRole("link", {
      name: /Začít se učit zdarma/i,
    });
    await expect(cta.first()).toBeVisible();
    await cta.first().click();

    // 3–5. No login / onboarding wall — ČJL visible
    await expect(page).toHaveURL(/\/app\/learn/, { timeout: 35_000 });
    await assertNoAuthWall(page);
    await expect(
      page.getByRole("heading", { name: /Český jazyk/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("body")).toContainText(/literatura/i);

    // 6. Moje materiály — catalog sources
    const materialsNav = page
      .getByRole("link", { name: /Moje materiály|^Materiály$/i })
      .first();
    if (await materialsNav.count()) {
      await materialsNav.click();
    } else {
      await page.goto("/app/materials");
    }
    await expect(page).toHaveURL(/\/app\/materials/, { timeout: 20_000 });
    await assertNoAuthWall(page);
    await expect(page.locator("body")).toContainText(/Realismus|Katalog/i, {
      timeout: 20_000,
    });
    // At least several catalog titles (12 DOCX inventory)
    const catalogText = await page.locator("body").innerText();
    expect(catalogText).toMatch(/Realismus/i);
    expect(catalogText).toMatch(/Romantismus|Národní|Máj|Kytice|Babička/i);

    // Open Realismus learn session directly (avoid overview race)
    await page.goto("/app/materials/katalog/cjl-realismus?mode=learn");
    await expect(page).toHaveURL(/katalog\/cjl-realismus/, {
      timeout: 25_000,
    });
    await assertNoAuthWall(page);

    const learnTab = page.getByRole("button", { name: /^Učení$/i });
    if (await learnTab.count()) await learnTab.click();
    await waitForLearningSessionReady(page);

    // 9–11. Answer ≥5 interactions; force at least one mistake via Nevím
    const answered = await answerLearningSessionSteps(page, 5);
    expect(answered).toBeGreaterThanOrEqual(5);

    // 12. Moje chyby
    await page.goto("/app/mistakes");
    await assertNoAuthWall(page);
    await expect(
      page.getByRole("heading", { name: /Moje chyby/i }).first(),
    ).toBeVisible({ timeout: 25_000 });
    await expect(page.locator("body")).toContainText(
      /Aktivní|Procvičit|chyba|Správný|Proč|Výskyt|otáz/i,
      { timeout: 20_000 },
    );

    // 13–15. Reload progress remains (guest cookie + mistakes)
    const cookies = await context.cookies();
    expect(cookies.some((c) => c.name === "dm_guest_id")).toBe(true);
    await page.reload();
    await assertNoAuthWall(page);
    await expect(page.locator("body")).toContainText(/Moje chyby|Aktivní/i, {
      timeout: 20_000,
    });

    // 16–18. Another topic + quick test
    await page.goto("/app/tests?mode=quick_5");
    await assertNoAuthWall(page);
    await expect(page.locator("body")).toContainText(
      /Rychlých 5|Testy|Režimy/i,
      { timeout: 25_000 },
    );
    // Auto-start or click
    const startQuick = page.getByRole("button", {
      name: /Rychlých 5 otázek/i,
    });
    if (await startQuick.isVisible().catch(() => false)) {
      await startQuick.click();
    }
    await expect(
      page.getByText(/Odeslat|Nevím|Shrnutí|Správně|Nesprávně/i).first(),
    ).toBeVisible({ timeout: 45_000 });

    for (let i = 0; i < 12; i++) {
      const done = await page
        .getByText(/Shrnutí testu|Co už umíš/i)
        .isVisible()
        .catch(() => false);
      if (done) break;
      const nevim = page.getByRole("button", { name: /^Nevím$/i });
      const odeslat = page.getByRole("button", { name: /^Odeslat$/i });
      const dalsi = page.getByRole("button", { name: /^Další$|^Shrnutí$/i });
      if (await nevim.isVisible().catch(() => false)) {
        await nevim.click();
        await page.waitForTimeout(400);
      } else if (await odeslat.isVisible().catch(() => false)) {
        const ta = page.locator("textarea");
        if (await ta.count()) await ta.fill("odpověď");
        const choice = page.locator("ul button").first();
        if (await choice.isVisible().catch(() => false)) await choice.click();
        await odeslat.click();
        await page.waitForTimeout(400);
      }
      if (await dalsi.isVisible().catch(() => false)) {
        await dalsi.click();
        await page.waitForTimeout(300);
      }
    }
    await expect(page.locator("body")).toContainText(
      /Shrnutí|Co už umíš|Co ještě|doporučený|Správně|částečně/i,
      { timeout: 30_000 },
    );

    // 19. Progress
    await page.goto("/app/progress");
    await assertNoAuthWall(page);
    await expect(page.locator("body")).toContainText(
      /Pokrok|Mastery|NEW|LEARNING|Připravenost|Maturita|evidence/i,
      { timeout: 25_000 },
    );

    // 20. Deep link study page
    await page.goto("/app/learn");
    await assertNoAuthWall(page);
    await expect(
      page.getByRole("heading", { name: /Český jazyk/i }),
    ).toBeVisible({ timeout: 25_000 });

    await assertNoConsoleBreakers(page, pageErrors);
  });
});

test.describe("P0 mobile guest smoke", () => {
  test.use({
    storageState: { cookies: [], origins: [] },
    ...{
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    },
  });

  test("mobile: homepage CTA → ČJL → materials", async ({ page, context }) => {
    test.setTimeout(120_000);
    await context.clearCookies();
    await page.goto("/");
    await page
      .getByRole("link", { name: /Začít se učit zdarma/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/app\/learn/, { timeout: 35_000 });
    await assertNoAuthWall(page);
    await expect(
      page.getByRole("heading", { name: /Český jazyk/i }),
    ).toBeVisible({ timeout: 30_000 });
    await page.goto("/app/materials");
    await assertNoAuthWall(page);
    await expect(page.locator("body")).toContainText(/Realismus|Katalog/i, {
      timeout: 20_000,
    });
    await page.goto("/app/materials/katalog/cjl-romantismus");
    await assertNoAuthWall(page);
    await expect(page.locator("body")).toContainText(/Romantismus|Přehled|Učení/i, {
      timeout: 25_000,
    });
  });
});
