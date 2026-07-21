#!/usr/bin/env npx tsx
/** CLI: npm run seed:flashcards */

import { seedFlashcards } from "../src/server/flashcards/seed";

async function main() {
  console.log("Seeding flashcard decks…");
  const { deck, count } = await seedFlashcards();
  const types = new Set(deck.cards.map((c) => c.type));
  console.log("\n=== Flashcards seed ===");
  console.log(`decks:  ${count}`);
  console.log(`slug:   ${deck.slug}`);
  console.log(`title:  ${deck.title}`);
  console.log(`cards:  ${deck.cards.length}`);
  console.log(`types:  ${[...types].join(" · ")}`);
  console.log("\nUI: /app/review");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
