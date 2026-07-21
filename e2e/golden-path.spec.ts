import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";

/**
 * Golden path E2E (D-063): register → onboarding → dashboard → materials
 * edge cases → logout/login → mobile → no developer seed leaks.
 *
 * Requires local-dev Auth (no Supabase) or configured Auth.
 */

async function completeOnboarding(page: Page, displayName: string) {
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 20_000,
  });

  // Step: name
  const nameInput = page.getByLabel(/jmé|říkat|jmeno|name/i).first();
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill(displayName);
  } else {
    await page.locator("input").first().fill(displayName);
  }
  await page.getByRole("button", { name: /Další|Pokračovat|Hotovo/i }).click();

  // Remaining steps: accept defaults via Další until submit
  for (let i = 0; i < 8; i++) {
    if (page.url().includes("/app/")) break;
    const next = page.getByRole("button", {
      name: /Další|Pokračovat|Dokončit|Uložit|Hotovo/i,
    });
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
    await page.waitForTimeout(400);
  }

  await expect(page).toHaveURL(/\/app\//, { timeout: 30_000 });
}

test.describe("golden path", () => {
  test("new user → onboarding → dashboard → logout/login", async ({
    page,
    browser,
  }) => {
    const stamp = Date.now();
    const email = `e2e.gold.${stamp}@example.com`;
    const password = "e2e-gold-password-99";

    await page.goto("/registrace");
    const unavailable = page.getByText(/Registrace teď není dostupná/i);
    if (await unavailable.isVisible().catch(() => false)) {
      test.skip(true, "Auth not configured in this environment");
    }

    await page.getByLabel(/E-mail/i).fill(email);
    await page.getByLabel(/^Heslo/i).fill(password);
    const confirm = page.getByLabel(/Heslo znovu|Potvrď|znovu/i);
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.fill(password);
    }
    await page.getByRole("button", { name: /Vytvořit účet|Registrovat/i }).click();

    // Email confirm gate or onboarding
    await page.waitForTimeout(1500);
    if (page.url().includes("/registrace")) {
      const info = await page.locator("body").innerText();
      if (/Potvrď e-mail|schránky/i.test(info)) {
        test.skip(true, "Email confirmation required — use local Auth");
      }
    }

    if (!page.url().includes("/onboarding") && !page.url().includes("/app/")) {
      await page.goto("/onboarding");
    }

    await completeOnboarding(page, `E2E ${stamp}`);
    await expect(page.locator("body")).toContainText(/Dnes|mise|materiál|Plán/i);

    // No developer seed commands anywhere in learner chrome
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/npm run seed/i);

    // Materials: empty upload rejected
    await page.goto("/app/materials");
    await expect(page.locator("body")).toContainText(/materiál/i);

    const tmpDir = path.join(os.tmpdir(), `dm-e2e-${stamp}`);
    mkdirSync(tmpDir, { recursive: true });
    const emptyPath = path.join(tmpDir, "empty.txt");
    writeFileSync(emptyPath, "");
    const okPath = path.join(tmpDir, "notes.txt");
    writeFileSync(
      okPath,
      "Romantismus je umělecký směr 19. století. Máj od K. H. Máchy.",
    );

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count()) {
      await fileInput.setInputFiles(emptyPath);
      await page.waitForTimeout(800);
      const afterEmpty = await page.locator("body").innerText();
      expect(afterEmpty).toMatch(/prázdn|nepoved|chyba|Soubor/i);

      await fileInput.setInputFiles(okPath);
      await page.waitForTimeout(2500);
      const afterOk = await page.locator("body").innerText();
      expect(afterOk).not.toMatch(/npm run seed/i);
    }

    // Logout / login (returning user)
    await page.goto("/app/profile");
    const logout = page.getByRole("button", { name: /Odhlásit/i });
    if (await logout.isVisible().catch(() => false)) {
      await logout.click();
      await page.waitForTimeout(800);
    } else {
      // Fallback: clear cookies
      await page.context().clearCookies();
    }

    await page.goto("/prihlaseni");
    await page.getByLabel(/E-mail/i).fill(email);
    await page.getByLabel(/^Heslo/i).fill(password);
    await page.getByRole("button", { name: /Přihlásit/i }).click();
    await expect(page).toHaveURL(/\/app\//, { timeout: 20_000 });

    // Different browser context = returning session isolation check
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto("/app/dashboard");
    await expect(page2).toHaveURL(/prihlaseni|registrace|onboarding/i);
    await ctx2.close();
  });

  test("mobile viewport: dashboard after auth gate is usable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/npm run seed/i);
  });

  test("slow connection homepage still renders brand", async ({ page }) => {
    await page.route("**/*", async (route) => {
      await new Promise((r) => setTimeout(r, 80));
      await route.continue();
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toContainText(/Matur|Dám/i);
  });

  test("forged admin cookie does not open studio", async ({ page }) => {
    await page.context().addCookies([
      {
        name: "dm_admin_session",
        value: "forged-token-not-hmac",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    await page.goto("/admin/content");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("learn empty states never show npm seed commands", async ({ page }) => {
    await page.goto("/app/learn");
    // May redirect to login — either way no seed strings
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/npm run seed/i);
    expect(body).not.toMatch(/npx tsx/i);
  });
});
