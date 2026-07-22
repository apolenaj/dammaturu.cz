import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getEmailField } from "./helpers/auth-form";

const viewports = [
  { name: "320", width: 320, height: 568 },
  { name: "375", width: 375, height: 667 },
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

async function noHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  // Allow 1px subpixel; tablet shells can have ~2px scrollbar gutter noise.
  expect(overflow).toBeLessThanOrEqual(2);
}

test.describe("responsive + overflow", () => {
  for (const vp of viewports) {
    test(`home no horizontal overflow @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await noHorizontalOverflow(page);
    });

    test(`registrace touch + overflow @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const res = await page.goto("/registrace");
      expect(res?.status()).toBeLessThan(500);
      await noHorizontalOverflow(page);
      if (vp.width <= 430) {
        const email = await getEmailField(page);
        if (!email) {
          test.skip(true, "Auth not configured — no registration form");
          return;
        }
        await expect(email).toBeVisible();
        const box = await email.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
      }
    });
  }
});

test.describe("keyboard + skip link", () => {
  test("skip link moves focus to main", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /Přeskočit na obsah/i });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    const main = page.locator("#main-content");
    await expect(main).toBeVisible();
  });

  test("registration form is keyboard operable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/registrace");
    const email = await getEmailField(page);
    if (!email) {
      test.skip(true, "Auth not configured — no registration form");
      return;
    }
    await email.focus();
    await expect(email).toBeFocused();
    await page.keyboard.type("student@example.com");
    await page.keyboard.press("Tab");
    const password = page
      .getByLabel(/^Heslo$/i)
      .or(page.getByPlaceholder(/^Heslo$/i));
    await expect(password.first()).toBeFocused();
  });
});

test.describe("axe — public surfaces", () => {
  test("homepage has no critical axe violations", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(
      critical,
      critical.map((v) => `${v.id}: ${v.help}`).join("\n"),
    ).toEqual([]);
  });

  test("registrace has no critical axe violations", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/registrace");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(
      critical,
      critical.map((v) => `${v.id}: ${v.help}`).join("\n"),
    ).toEqual([]);
  });
});
