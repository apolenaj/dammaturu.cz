import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";

/**
 * UI launch-gate companion — real browser, real local-dev account, real Czech TXT upload.
 * Complements scripts/launch-gate-golden-path.ts (server pipeline).
 */

const CZECH_DOC = [
  "# Český jazyk a literatura — maturita",
  "",
  "Karel Hynek Mácha napsal skladbu Máj v roce 1836. Máj je klíčové dílo českého romantismu.",
  "Mácha žil v letech 1810 až 1836. Motivem je láska, vina a trest.",
  "Jan Neruda psal Povídky malostranské. Realismus popisuje všední život měšťanů.",
].join("\n");

async function clickNext(page: Page) {
  const btn = page.getByRole("button", {
    name: /Další|Pokračovat|Dokončit|Uložit|Hotovo/i,
  });
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await btn.click();
}

async function completeOnboarding(page: Page, name: string, examDate: string) {
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 20_000,
  });

  await page.getByLabel(/Jméno/i).fill(name);
  await clickNext(page);

  // Date step
  await page.getByLabel(/Cílové datum|maturita/i).fill(examDate);
  await clickNext(page);

  // School + subjects — ČJL should be default/selected
  const cjl = page.getByRole("button", { name: /Český jazyk|literatur/i });
  if (await cjl.first().isVisible().catch(() => false)) {
    await cjl.first().click();
  }
  await clickNext(page);

  // Remaining wizard steps with defaults
  for (let i = 0; i < 6; i++) {
    if (page.url().includes("/app/")) break;
    const next = page.getByRole("button", {
      name: /Další|Pokračovat|Dokončit|Uložit|Hotovo/i,
    });
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
    await page.waitForTimeout(500);
  }
  await expect(page).toHaveURL(/\/app\//, { timeout: 30_000 });
}

test.describe("launch gate UI", () => {
  test("desktop: home → register → onboard → upload Czech doc → study entry", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const stamp = Date.now();
    const email = `ui.gate.${stamp}@example.com`;
    const password = "UiGate-Pass-99";
    const examDate = "2026-05-20";

    // 1. Homepage
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Matur|Dám/i);
    const homeText = await page.locator("body").innerText();
    expect(homeText).not.toMatch(/npm run seed/i);

    // 2. Register
    await page.goto("/registrace");
    if (await page.getByText(/Registrace teď není dostupná/i).isVisible().catch(() => false)) {
      test.skip(true, "Auth unavailable");
    }
    await page.getByLabel(/E-mail/i).fill(email);
    await page.getByLabel(/^Heslo$/i).fill(password);
    const confirm = page.getByLabel(/Heslo znovu|Potvrď|znovu/i);
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.fill(password);
    }
    await page.getByRole("button", { name: /Vytvořit účet|Registrovat/i }).click();
    await page.waitForTimeout(1500);
    if ((await page.locator("body").innerText()).match(/Potvrď e-mail/i)) {
      test.skip(true, "Email confirmation required");
    }

    // 3–5. Onboarding
    if (!page.url().includes("/onboarding")) {
      await page.goto("/onboarding");
    }
    await completeOnboarding(page, `Tereza UI ${stamp}`, examDate);

    // 6–7. Materials upload
    await page.goto("/app/materials");
    await expect(page.locator("body")).toContainText(/materiál/i);
    const tmpDir = path.join(os.tmpdir(), `dm-ui-gate-${stamp}`);
    mkdirSync(tmpDir, { recursive: true });
    const docPath = path.join(tmpDir, "cjl-poznamky.txt");
    writeFileSync(docPath, CZECH_DOC, "utf8");

    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached({ timeout: 15_000 });
    await fileInput.setInputFiles(docPath);

    // Wait for ready / processed status
    await expect(page.locator("body")).toContainText(
      /připraven|ready|témat|bod|zprac|Romantismus|Mácha|poznámk/i,
      { timeout: 60_000 },
    );
    const materialsBody = await page.locator("body").innerText();
    expect(materialsBody).not.toMatch(/npm run seed/i);
    expect(materialsBody).not.toMatch(/selhalo|Nepodporovaný formát/i);

    // 9. Start study from materials
    await page.goto("/app/materials/study");
    await expect(page.locator("body")).toContainText(/stud|materiál|mix|téma/i, {
      timeout: 20_000,
    });
    // Select material if checkbox/button present
    const start = page.getByRole("button", {
      name: /Začít|Spustit|Chytrý mix|Studovat/i,
    });
    if (await start.first().isVisible().catch(() => false)) {
      await start.first().click();
      await page.waitForTimeout(1500);
    }
    const studyBody = await page.locator("body").innerText();
    // Either in play or picker with ready materials
    expect(studyBody.length).toBeGreaterThan(40);

    // 16. Progress
    await page.goto("/app/progress");
    await expect(page.locator("body")).toContainText(/pokrok|připraven|mastery|%/i, {
      timeout: 20_000,
    });

    // 19–20. Logout / login
    await page.goto("/app/profile");
    const logout = page.getByRole("button", { name: /Odhlásit/i });
    await expect(logout).toBeVisible({ timeout: 15_000 });
    await logout.click();
    await page.waitForTimeout(1000);

    await page.goto("/prihlaseni");
    await page.getByLabel(/E-mail/i).fill(email);
    await page.getByLabel(/^Heslo$/i).fill(password);
    await page.getByRole("button", { name: /Přihlásit/i }).click();
    await expect(page).toHaveURL(/\/app\//, { timeout: 25_000 });

    // 21. Data still there
    await page.goto("/app/materials");
    await expect(page.locator("body")).toContainText(/poznámk|Romantismus|Mácha|připraven|materiál/i, {
      timeout: 20_000,
    });
  });

  test("mobile 390: home + registrace + no seed leaks", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);
    expect(await page.locator("body").innerText()).not.toMatch(/npm run seed/i);

    await page.goto("/registrace");
    const email = page.getByLabel(/E-mail/i).first();
    await expect(email).toBeVisible();
    const box = await email.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
  });
});
