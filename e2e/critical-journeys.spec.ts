import { expect, test } from "@playwright/test";

/**
 * Critical journeys — smoke only. Not a full matrix.
 */
test.describe("critical journeys", () => {
  test("home loads with brand", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Matur|Dám/i);
  });

  test("onboarding route is reachable", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.locator("body")).toContainText(/onboarding|profil|maturit/i);
  });

  test("admin is gated without session", async ({ page }) => {
    await page.goto("/admin/content");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { name: /Admin přihlášení/i })).toBeVisible();
  });

  test("admin login with secret reaches studio shell", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel(/Heslo/i).fill(
      process.env.ADMIN_SECRET ?? "dev-admin-secret",
    );
    await page.getByRole("button", { name: /Vstoupit/i }).click();
    await expect(page).not.toHaveURL(/\/admin\/login/);
    await page.goto("/admin/content");
    await expect(page.locator("body")).toContainText(/Content|Studio|Obsah|entity/i);
  });

  test("app dashboard empty/login path does not 500", async ({ page }) => {
    const res = await page.goto("/app/dashboard");
    expect(res?.status()).toBeLessThan(500);
  });

  test("tests hub loads", async ({ page }) => {
    const res = await page.goto("/app/tests");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: /Testy/i })).toBeVisible();
  });
});
