import type { Locator, Page } from "@playwright/test";

/**
 * Registration / login email field.
 * Prefers accessible name (label via Field htmlFor); falls back to placeholder.
 * Returns null when auth is not configured (unavailable copy on the page).
 */
export async function getEmailField(page: Page): Promise<Locator | null> {
  const unavailable = page.getByText(
    /Registrace teď není dostupná|Přihlášení teď není dostupná/i,
  );
  if (await unavailable.isVisible().catch(() => false)) {
    return null;
  }

  const byRole = page.getByRole("textbox", { name: /E-mail/i });
  if ((await byRole.count()) > 0) return byRole.first();

  const byLabel = page.getByLabel(/^E-mail$/i);
  if ((await byLabel.count()) > 0) return byLabel.first();

  const byPlaceholder = page.getByPlaceholder(/^E-mail$/i);
  if ((await byPlaceholder.count()) > 0) return byPlaceholder.first();

  return null;
}
