import { expect, type Page } from "@playwright/test";

/** Primary forward CTA — last step is „Vytvořit plán“, not „Dokončit“. */
const NEXT_OR_SUBMIT =
  /^(Pokračovat|Další|Vytvořit plán|Uložit změny|Dokončit|Uložit|Hotovo)$/i;

function futureExamDate(daysAhead = 60): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

async function clickPrimaryNext(page: Page) {
  const btn = page.getByRole("button", { name: NEXT_OR_SUBMIT });
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await btn.click();
}

/**
 * Label text may include a requiredMark "*" that breaks exact /^Jméno$/ getByLabel.
 * Prefer role/placeholder which use the accessible name.
 */
async function fillDisplayName(page: Page, value: string) {
  const byRole = page.getByRole("textbox", { name: /Jméno/i });
  if ((await byRole.count()) > 0) {
    await expect(byRole.first()).toBeVisible({ timeout: 10_000 });
    await byRole.first().fill(value);
    return;
  }

  const byPlaceholder = page.getByPlaceholder(/Tereza|Jméno/i);
  if ((await byPlaceholder.count()) > 0) {
    await byPlaceholder.first().fill(value);
    return;
  }

  const byLabel = page.getByLabel(/Jméno/i);
  await expect(byLabel).toBeVisible({ timeout: 10_000 });
  await byLabel.fill(value);
}

/**
 * Walk the full onboarding wizard into /app/.
 * Fills required fields; uses defaults where the UI already has them.
 */
export async function completeOnboardingWizard(
  page: Page,
  options: {
    displayName: string;
    /** ISO date YYYY-MM-DD — must be today or later. */
    examDate?: string;
  },
) {
  const examDate = options.examDate ?? futureExamDate();

  if (!page.url().includes("/onboarding")) {
    await page.goto("/onboarding");
  }
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 20_000,
  });

  // 1. Name
  await expect(
    page.getByRole("heading", { name: /Jak ti máme říkat/i }),
  ).toBeVisible({ timeout: 10_000 });
  await fillDisplayName(page, options.displayName);
  await clickPrimaryNext(page);

  // 2. Target date (must not be in the past)
  await expect(
    page.getByRole("heading", { name: /připraven/i }),
  ).toBeVisible({ timeout: 10_000 });
  const dateInput = page
    .getByLabel(/Cílové datum|maturita/i)
    .or(page.locator("#targetDate"));
  await expect(dateInput.first()).toBeVisible({ timeout: 10_000 });
  await dateInput.first().fill(examDate);
  await clickPrimaryNext(page);

  // 3. School + subjects — ČJL is default; ensure at least one subject
  await expect(
    page.getByRole("heading", { name: /Škola a předměty/i }),
  ).toBeVisible({ timeout: 10_000 });
  const cjl = page.getByRole("button", {
    name: /Český jazyk a literatura/i,
  });
  if (await cjl.isVisible().catch(() => false)) {
    const pressed = await cjl.getAttribute("aria-pressed");
    if (pressed !== "true") await cjl.click();
  }
  await clickPrimaryNext(page);

  // 4. Readiness — default is fine; click next
  await expect(
    page.getByRole("heading", { name: /Jak se teď cítíš/i }),
  ).toBeVisible({ timeout: 10_000 });
  await clickPrimaryNext(page);

  // 5. Time budget — defaults (25 min / evening)
  await expect(
    page.getByRole("heading", { name: /Kolik času denně/i }),
  ).toBeVisible({ timeout: 10_000 });
  await clickPrimaryNext(page);

  // 6. Mode → submit „Vytvořit plán“
  await expect(
    page.getByRole("heading", { name: /Jaký režim/i }),
  ).toBeVisible({ timeout: 10_000 });
  await clickPrimaryNext(page);

  await expect(page).toHaveURL(/\/app\//, { timeout: 45_000 });
}

export { futureExamDate };
