"use server";

import type { QuestionGenerationResult } from "@/domain/learning/question-generation";
import type { QuestionPack } from "@/domain/learning/question-engine";
import type { FlashcardDeck } from "@/domain/learning/flashcards";
import { getLearnerIdFromCookies } from "@/server/learner-session";
import { getLearnerMaterial } from "@/server/learner-materials/store";
import {
  buildFlashcardDeckFromGenerated,
  buildPackFromGeneratedQuestions,
  generateQuestionsFromKnowledgeUnits,
  learnerUnitsToVerifiedInputs,
} from "@/server/question-engine/generate";

/**
 * Generate questions from verified KnowledgeUnits of selected ready materials.
 * Draft output — does not auto-publish to the catalog.
 */
export async function generateQuestionsFromMyMaterialsAction(input: {
  materialIds: string[];
  maxQuestions?: number;
}): Promise<
  | {
      ok: true;
      generation: QuestionGenerationResult;
      pack: QuestionPack | null;
      flashcardDeck: FlashcardDeck | null;
    }
  | { ok: false; error: string }
> {
  const learnerId = await getLearnerIdFromCookies();
  if (!learnerId) return { ok: false, error: "Nejdřív se přihlas." };

  const ids = [...new Set(input.materialIds)].slice(0, 8);
  if (!ids.length) {
    return { ok: false, error: "Vyber aspoň jeden materiál." };
  }

  const verified = [];
  for (const id of ids) {
    const material = await getLearnerMaterial(learnerId, id);
    if (!material || material.status !== "ready") {
      return {
        ok: false,
        error: "Materiál musí být ve stavu Připraveno.",
      };
    }
    verified.push(...learnerUnitsToVerifiedInputs(material));
  }

  if (!verified.length) {
    return {
      ok: false,
      error:
        "Žádné ověřené znalostní jednotky (Ověřeno ze zdroje). Nejdřív zpracuj materiál s jasnými fakty.",
    };
  }

  const generation = generateQuestionsFromKnowledgeUnits(verified, {
    maxQuestions: input.maxQuestions ?? 40,
    maxPerUnit: 5,
  });

  if (!generation.questions.length) {
    return {
      ok: false,
      error:
        "Nepodařilo se sestavit otázky podložené zdrojem. Zkus bohatší materiál.",
    };
  }

  const slugBase = `z-materialu-${ids[0]!.slice(0, 8)}`;
  const pack = buildPackFromGeneratedQuestions({
    questions: generation.questions,
    slug: slugBase,
    title: "Otázky z mých materiálů",
    summary:
      "Generováno z ověřených KnowledgeUnits. Každá otázka má zdrojovou evidenci.",
  });
  const flashcardDeck = buildFlashcardDeckFromGenerated({
    questions: generation.questions,
    slug: `${slugBase}-karty`,
    title: "Karty z mých materiálů",
    summary: "Flashkarty z ověřených KnowledgeUnits.",
  });

  return { ok: true, generation, pack, flashcardDeck };
}
