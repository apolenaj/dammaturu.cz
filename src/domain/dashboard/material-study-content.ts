/**
 * Typy studijního balíčku pro dashboard /uceni/[materialId].
 * Obsah se generuje výhradně přes OpenAI (`generate-from-source.ts`).
 */

export type MaterialFlashcard = {
  id: string;
  front: string;
  back: string;
};

export type MaterialQuizOption = {
  id: "A" | "B" | "C" | "D";
  text: string;
};

export type MaterialQuizQuestion = {
  id: string;
  prompt: string;
  options: MaterialQuizOption[];
  correctOptionId: "A" | "B" | "C" | "D";
  explanation: string;
};

export type MaterialMatchPair = {
  id: string;
  term: string;
  definition: string;
};

export type MaterialStudyPackCore = {
  flashcards: MaterialFlashcard[];
  quiz: MaterialQuizQuestion[];
  audioSummary: string;
};

export type MaterialStudyPack = MaterialStudyPackCore & {
  story: string;
  matchPairs: MaterialMatchPair[];
};
