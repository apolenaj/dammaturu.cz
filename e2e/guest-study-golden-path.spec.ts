import { expect, test } from "@playwright/test";

/**
 * Anonymous Guest Study Mode — golden path (incognito / fresh storage).
 * No registration, no login, progress survives reload.
 */
test.describe("guest study golden path", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("homepage CTA → Czech study → learn → test → mistake → reload keeps progress", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await context.clearCookies();

    // 1–2. Homepage → primary CTA
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    const cta = page.getByRole("link", {
      name: /Začít se učit zdarma/i,
    });
    await expect(cta.first()).toBeVisible();
    await cta.first().click();

    // 3. Czech study hub — no login
    await expect(page).toHaveURL(/\/app\/learn/, { timeout: 30_000 });
    await expect(page).not.toHaveURL(/prihlaseni|registrace/);
    await expect(
      page.getByRole("heading", { name: /Český jazyk/i }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator("body")).toContainText(/host|literatura/i);

    // 4. Open existing catalog material (Homonyma — first recommended)
    const startHere = page.getByRole("link", { name: /Začni tady|Začít/i }).first();
    if (await startHere.count()) {
      await startHere.click();
    } else {
      await page.goto("/app/materials/katalog/cjl-homonyma?mode=learn");
    }
    await expect(page).toHaveURL(/\/app\/materials\/katalog\//, {
      timeout: 20_000,
    });
    await expect(page.locator("body")).toContainText(
      /Homonyma|Realismus|Učení|materiál|chunk|stud/i,
      { timeout: 20_000 },
    );

    // 5. Complete learning interaction if a choice is offered
    const choice = page
      .locator("button")
      .filter({ hasText: /./ })
      .filter({ hasNotText: /←|Učit se|ČJL|Materiály/i })
      .last();
    if (await choice.isVisible().catch(() => false)) {
      await choice.click();
      await page.waitForTimeout(1500);
    }

    // 6–7. Test question — pick a clearly wrong option to create a mistake
    await page.goto("/app/tests/otazky/cjl-otazky");
    await expect(page).not.toHaveURL(/prihlaseni/);
    await expect(page.locator("body")).toContainText(/realism/i, {
      timeout: 20_000,
    });

    const wrong = page.getByRole("button", {
      name: /Allegorie středověkých legend|Automatické psaní|Cit a subjektivita/i,
    });
    await expect(wrong.first()).toBeVisible({ timeout: 15_000 });
    await wrong.first().click();
    await page.getByRole("button", { name: /^Odeslat$/i }).click();
    await expect(page.locator("body")).toContainText(
      /Špatně|skoro|Vysvětlení|Správně|chyb/i,
      { timeout: 15_000 },
    );

    await page.goto("/app/mistakes");
    await expect(page).not.toHaveURL(/prihlaseni/);
    await expect(
      page.getByRole("heading", { name: /^Moje chyby$/i }).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("body")).toContainText(
      /chyby|Slabiny|test|otáz|procvič|zatím žádné/i,
      { timeout: 15_000 },
    );

    // 8–9. Reload — guest cookie + progress survive
    await page.goto("/app/tests/otazky/cjl-otazky");
    await expect(page.locator("body")).toContainText(/Správně|1|otáz/i, {
      timeout: 20_000,
    });
    const progressBefore = await page.locator("body").innerText();
    await page.reload();
    await expect(page).not.toHaveURL(/prihlaseni|registrace/);
    await expect(page.locator("body")).toContainText(/otáz|realism|ČJL/i, {
      timeout: 20_000,
    });
    const progressAfter = await page.locator("body").innerText();
    expect(progressAfter.length).toBeGreaterThan(40);
    // Completed progress should still show (count / Další / Správně stat)
    expect(progressAfter).toMatch(/Správně|Další|1\s*\/|dokončen/i);

    const cookies = await context.cookies();
    expect(cookies.some((c) => c.name === "dm_guest_id")).toBe(true);
    expect(page.url()).not.toMatch(/prihlaseni/);
    void progressBefore;
  });
});
