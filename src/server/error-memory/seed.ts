/**
 * Seed / fake ErrorMemory is intentionally disabled.
 * Moje chyby stores only real graded mistakes from learner activity.
 */
export async function seedErrorMemory(): Promise<never> {
  throw new Error(
    "Ukázkové chyby se nevytvářejí. Moje chyby bere jen reálné odpovědi studenta.",
  );
}

export function buildSeedErrorBook(): never {
  throw new Error(
    "Ukázkové chyby se nevytvářejí. Moje chyby bere jen reálné odpovědi studenta.",
  );
}
