import { track } from "@/lib/analytics";
import { randomUUID } from "node:crypto";
import {
  emptyErrorBook,
  recordError,
  type ErrorMemoryBook,
  type ErrorType,
} from "@/domain/learning/error-memory";
import { saveErrorBook } from "@/server/error-memory/store";

type SeedDraft = {
  question: string;
  studentAnswer: string;
  correctConcept: string;
  whyWrong: string;
  slug: string;
  title: string;
  errorType: ErrorType;
};

const SEED_ERRORS: SeedDraft[] = [
  {
    question: "Kdo napsal Otec Goriot?",
    studentAnswer: "Charles Dickens",
    correctConcept: "Honoré de Balzac",
    whyWrong:
      "Zaměnil autory realismu — Dickens píše Oliver Twist, Goriot patří Balzacovi.",
    slug: "goriot",
    title: "Otec Goriot — autor",
    errorType: "author_work_swap",
  },
  {
    question: "Pro romantismus je typické…",
    studentAnswer: "typizace všedního života",
    correctConcept: "subjektivita a cit",
    whyWrong:
      "Zaměnil znaky směrů — typizace všedního života je realismus, ne romantismus.",
    slug: "romantismus",
    title: "Romantismus — znak",
    errorType: "concept_misunderstanding",
  },
  {
    question: "Baladickou sbírku Kytice napsal…",
    studentAnswer: "K. H. Mácha",
    correctConcept: "K. J. Erben",
    whyWrong: "Zaměnil Máj (Mácha) s Kyticí (Erben).",
    slug: "distinguish-maj-kytice",
    title: "Rozliš: Máj vs Kytice",
    errorType: "author_work_swap",
  },
  {
    question: "Metafora je…",
    studentAnswer: "záměna části a celku",
    correctConcept: "přenesené pojmenování podle podobnosti",
    whyWrong: "Zaměnil metaforu se synekdochou.",
    slug: "metafora",
    title: "Metafora",
    errorType: "literary_term",
  },
  {
    question: "Národní obrození spadá především…",
    studentAnswer: "do roku 1948",
    correctConcept: "na přelom 18./19. století",
    whyWrong: "Chronologická chyba — obrození není poválečné období.",
    slug: "obrozeni",
    title: "Národní obrození — období",
    errorType: "chronology",
  },
];

/** Demo book for local UI — learner id used by cookie after onboarding. */
export function buildSeedErrorBook(
  learnerId: string,
  nowIso = new Date().toISOString(),
): ErrorMemoryBook {
  let book = emptyErrorBook(learnerId, nowIso);
  for (const draft of SEED_ERRORS) {
    ({ book } = recordError(book, {
      id: randomUUID(),
      learnerId,
      question: draft.question,
      studentAnswer: draft.studentAnswer,
      correctConcept: draft.correctConcept,
      whyWrong: draft.whyWrong,
      knowledgeUnit: { slug: draft.slug, title: draft.title },
      errorType: draft.errorType,
      nowIso,
      source: "seed",
    }));
  }
  return book;
}

export async function seedErrorMemory(input?: {
  learnerId?: string;
}): Promise<{ learnerId: string; count: number }> {
  const learnerId = input?.learnerId ?? "demo-learner";
  const book = buildSeedErrorBook(learnerId);
  await saveErrorBook(book);
  track("error_memory_seeded", { learnerId, count: book.memories.length });
  return { learnerId, count: book.memories.length };
}
