import { expect, test } from "@playwright/test";
import { getEmailField } from "./helpers/auth-form";

const mobileWidths = [
  { name: "320", width: 320, height: 568 },
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 12/13", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
] as const;

/**
 * Mobile-first smoke: no horizontal overflow on public + auth shells.
 */
test.describe("mobile widths", () => {
  for (const vp of mobileWidths) {
    test(`home has no horizontal overflow @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        };
      });
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    });

    test(`registrace touch-friendly @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const res = await page.goto("/registrace");
      expect(res?.status()).toBeLessThan(500);
      const email = await getEmailField(page);
      if (!email) {
        test.skip(true, "Auth not configured — no registration form");
        return;
      }
      await expect(email).toBeVisible();
      const box = await email.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("PWA manifest is reachable", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();
    const json = (await res.json()) as {
      name?: string;
      display?: string;
      start_url?: string;
    };
    expect(json.name).toMatch(/DámMaturu/i);
    expect(json.display).toBe("standalone");
    expect(json.start_url).toContain("/app/dashboard");
  });

  test("service worker script is served", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain("dammaturu-shell");
  });

  test("offline page loads", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const res = await page.goto("/offline");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: /offline/i })).toBeVisible();
  });
});
