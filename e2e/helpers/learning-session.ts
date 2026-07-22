import { expect, type Page } from "@playwright/test";

/** Next-step CTA after graded feedback in LearningSessionPlayer. */
const NEXT_QUESTION = /Další otázka/i;

/** Grade badge text inside `[data-study-phase=feedback]` — not the „Zdroj“ tab. */
const GRADE_RESULT = /Správně|Částečně|Nesprávně/i;

async function recoverAppErrorIfNeeded(page: Page) {
  const retry = page.getByRole("button", { name: /Zkusit znovu/i });
  if (await retry.isVisible().catch(() => false)) {
    await retry.click();
    await page.waitForTimeout(800);
  }
}

/**
 * Wait until the catalog learn player is interactive — not merely the
 * „Připravuji…“ loading line (which the old wait treated as ready).
 */
export async function waitForLearningSessionReady(page: Page) {
  await recoverAppErrorIfNeeded(page);

  const start = page.getByRole("button", { name: /Spustit učení/i });
  if (await start.isVisible().catch(() => false)) {
    await start.click();
  }

  const ready = page
    .getByRole("button", { name: /Pokračovat k otázce/i })
    .or(page.getByRole("button", { name: /^Nevím$/i }))
    .or(page.getByRole("button", { name: /^Odeslat$/i }))
    .or(page.getByRole("textbox", { name: /Tvoje odpověď/i }));

  for (let attempt = 0; attempt < 3; attempt++) {
    if (await ready.first().isVisible().catch(() => false)) break;
    await recoverAppErrorIfNeeded(page);
    const learnTab = page.getByRole("button", { name: /^Učení$/i });
    if (await learnTab.isVisible().catch(() => false)) {
      await learnTab.click();
    }
    if (await start.isVisible().catch(() => false)) {
      await start.click();
    }
    await page.waitForTimeout(500);
  }

  await expect(ready.first()).toBeVisible({ timeout: 60_000 });
}

async function waitForGrade(page: Page) {
  await expect(
    page.locator('[data-study-phase="feedback"]').getByText(GRADE_RESULT),
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * Drive LearningSessionPlayer through ≥ minAnswers graded attempts.
 *
 * Pitfalls fixed for desktop:
 * - Do not wait on body text containing „Zdroj“ (matches the mode tab).
 * - Choice selectors must be `ul button`, not all answer-phase buttons
 *   (that includes disabled „Odeslat“).
 * - Prefer always-enabled „Nevím“ for reliable graded attempts.
 */
export async function answerLearningSessionSteps(
  page: Page,
  minAnswers = 5,
): Promise<number> {
  let answered = 0;
  const maxRounds = Math.max(50, minAnswers * 10);

  for (let i = 0; i < maxRounds && answered < minAnswers; i++) {
    await recoverAppErrorIfNeeded(page);

    const continueBtn = page.getByRole("button", {
      name: /Pokračovat k otázce/i,
    });
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.scrollIntoViewIfNeeded();
      await continueBtn.click();
      await page.waitForTimeout(300);
      continue;
    }

    const nextBtn = page.getByRole("button", { name: NEXT_QUESTION });
    const gradeVisible = await page
      .locator('[data-study-phase="feedback"]')
      .getByText(GRADE_RESULT)
      .isVisible()
      .catch(() => false);

    if (gradeVisible) {
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.scrollIntoViewIfNeeded();
        await nextBtn.click();
        await page.waitForTimeout(300);
      }
      continue;
    }

    const nevim = page.getByRole("button", { name: /^Nevím$/i });
    if (await nevim.isVisible().catch(() => false)) {
      // Wait until the previous submit finishes (buttons re-enable).
      await expect(nevim).toBeEnabled({ timeout: 30_000 });
      await nevim.scrollIntoViewIfNeeded();
      await nevim.click();
      await waitForGrade(page);
      answered += 1;
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(300);
      }
      continue;
    }

    // Confidence choices (no Nevím)
    const conf = page.getByRole("button", {
      name: /Umím to jistě|Skoro|Ještě si nejsem/i,
    });
    const odeslat = page.getByRole("button", { name: /^Odeslat$/i });
    if (await conf.first().isVisible().catch(() => false)) {
      await conf.last().click();
      await expect(odeslat).toBeEnabled({ timeout: 10_000 });
      await odeslat.click();
      await waitForGrade(page);
      answered += 1;
      if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click();
      continue;
    }

    // MC without Nevím
    const choice = page.locator('[data-study-phase="answer"] ul button').first();
    if ((await choice.count()) > 0 && (await choice.isVisible().catch(() => false))) {
      await choice.click();
      await expect(odeslat).toBeEnabled({ timeout: 10_000 });
      await odeslat.click();
      await waitForGrade(page);
      answered += 1;
      if (await nextBtn.isVisible().catch(() => false)) await nextBtn.click();
      continue;
    }

    await page.waitForTimeout(400);
  }

  return answered;
}
