import { buildCjlLiterarniDeck } from "@/server/flashcards/packs/cjl-literarni";
import { listFlashcardDecks, saveFlashcardDeck } from "@/server/flashcards/store";
import { track } from "@/lib/analytics";

export async function seedFlashcards() {
  const deck = buildCjlLiterarniDeck();
  await saveFlashcardDeck(deck);
  const all = await listFlashcardDecks();
  track("flashcards_seeded", {
    decks: all.length,
    slug: deck.slug,
    cards: deck.cards.length,
  });
  return { deck, count: all.length };
}
