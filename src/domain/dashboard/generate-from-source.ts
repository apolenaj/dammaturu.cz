/**
 * Generuje kartičky, kvíz a audio shrnutí přímo z extrahovaného textu materiálu.
 * Preferuje OpenAI (pokud je OPENAI_API_KEY), jinak lokální grounded generátor.
 */

import { z } from "zod";
import {
  ensureLearningExtras,
  type MaterialStudyPack,
} from "@/domain/dashboard/material-study-content";

const generatedPackSchema = z.object({
  flashcards: z
    .array(
      z.object({
        front: z.string().min(3).max(280),
        back: z.string().min(3).max(900),
      }),
    )
    .length(10),
  quiz: z
    .array(
      z.object({
        prompt: z.string().min(5).max(400),
        options: z
          .array(
            z.object({
              id: z.enum(["A", "B", "C", "D"]),
              text: z.string().min(2).max(280),
            }),
          )
          .length(4),
        correctOptionId: z.enum(["A", "B", "C", "D"]),
        explanation: z.string().min(20).max(900),
      }),
    )
    .length(10),
  audioSummary: z.string().min(40).max(2000),
  story: z.string().min(80).max(5000).optional(),
  matchPairs: z
    .array(
      z.object({
        term: z.string().min(2).max(120),
        definition: z.string().min(5).max(280),
      }),
    )
    .min(3)
    .max(8)
    .optional(),
});

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 28 && s.length <= 280)
    .filter((s) => /[A-Za-zÁ-ž]/.test(s));
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function pickDistractors(
  correct: string,
  pool: string[],
  count: number,
): string[] {
  const correctNorm = correct.toLowerCase();
  const candidates = uniqueBy(
    pool.filter((p) => {
      const n = p.toLowerCase();
      return (
        n !== correctNorm &&
        !n.includes(correctNorm.slice(0, 24)) &&
        Math.abs(p.length - correct.length) < 140
      );
    }),
    (p) => p.toLowerCase().slice(0, 40),
  );
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);

  // Uvěřitelné doplňky — záměny podobných tvrzení, ne očividné nesmysly.
  const plausibleFillers = [
    "Text to uvádí jen jako okrajovou poznámku bez většího významu.",
    "Podle textu jde o výjimku, která platí jen ve specifickém případě.",
    "Text popisuje opačný vztah, než jaký naznačuje správná odpověď.",
    "Jde o častou záměnu s podobným pojmem, který se v textu také objevuje.",
    "Text to spojuje s jiným obdobím / kontextem, než je ve správné odpovědi.",
  ];
  let fillerIdx = 0;
  while (picked.length < count) {
    picked.push(plausibleFillers[fillerIdx % plausibleFillers.length]!);
    fillerIdx += 1;
  }
  return picked;
}

function clipOption(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function buildLocalQuizExplanation(params: {
  correctLetter: "A" | "B" | "C" | "D";
  correctText: string;
  options: Array<{ id: "A" | "B" | "C" | "D"; text: string }>;
}): string {
  const wrongs = params.options
    .filter((o) => o.id !== params.correctLetter)
    .map((o) => `${o.id}) je chyták — podobá se správnému tvrzení, ale neodpovídá klíčové informaci z textu`)
    .join("; ");
  return `Správně je ${params.correctLetter}: ${params.correctText} Tato možnost přesně odpovídá tomu, co uvádí nahraný materiál. ${wrongs}.`;
}

function shuffleOptions<T extends { id: "A" | "B" | "C" | "D"; text: string }>(
  options: T[],
  correctText: string,
): { options: T[]; correctOptionId: "A" | "B" | "C" | "D" } {
  const texts = options.map((o) => o.text);
  for (let i = texts.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [texts[i], texts[j]] = [texts[j]!, texts[i]!];
  }
  const ids = ["A", "B", "C", "D"] as const;
  const next = ids.map((id, i) => ({ id, text: texts[i]! })) as T[];
  const correctOptionId =
    next.find((o) => o.text === correctText)?.id ?? "A";
  return { options: next, correctOptionId };
}

/**
 * Lokální generátor ze zdroje — tvoří otázky z vět dokumentu (grounded).
 * Cíl: vždy 10 kartiček vhodné k maturitnímu opakování.
 */
export function buildStudyPackFromSourceText(params: {
  title: string;
  subject: string;
  sourceText: string;
}): MaterialStudyPack {
  const sentences = uniqueBy(splitSentences(params.sourceText), (s) =>
    s.toLowerCase().slice(0, 60),
  );
  const definitionLike = sentences.filter((s) =>
    /\b(je|jsou|znamená|označuje|patří|zahrnuje|představuje|proto|důsled|vztah|rozdíl|vzorec|rok|stolet)\b/i.test(
      s,
    ),
  );
  const factPool = uniqueBy(
    [...definitionLike, ...sentences].slice(0, 40),
    (s) => s.toLowerCase().slice(0, 50),
  );

  const questionStarters = [
    "Jaký význam má v textu tato myšlenka?",
    "Jak to souvisí s ostatními pojmy v materiálu?",
    "Proč je tato informace důležitá k maturitě?",
    "Jak bys to vysvětlil vlastními slovy?",
    "Jaký chyták nebo nuance z textu si máš pamatovat?",
    "Jaké datum, jméno nebo vztah text zdůrazňuje?",
    "Čím se to liší od podobného pojmu?",
    "Jaký důsledek nebo příčinu text popisuje?",
    "Co bys uvedl jako příklad z materiálu?",
    "Jakou formulaci bys použil u ústní zkoušky?",
  ];

  const flashcards = factPool.slice(0, 10).map((sentence, i) => {
    const detail =
      sentence.length > 220 ? `${sentence.slice(0, 217).trim()}…` : sentence;
    return {
      id: `src-fc-${i + 1}`,
      front: `${questionStarters[i % questionStarters.length]} (${params.title})`,
      back: detail,
    };
  });

  while (flashcards.length < 10) {
    const n = flashcards.length + 1;
    flashcards.push({
      id: `src-fc-fill-${n}`,
      front: `Jaký klíčový bod ${n}/10 si odnést z materiálu „${params.title}“?`,
      back: `Zaměř se na souvislosti v oblasti ${params.subject}: hlavní pojem, konkrétní příklad z textu a proč se to u maturity ptají.`,
    });
  }

  const quizPrompts = [
    (title: string) =>
      `Která formulace nejpřesněji vystihuje klíčovou myšlenku z materiálu „${title}“?`,
    (title: string) =>
      `Co z textu „${title}“ je nejdůležitější si pamatovat k maturitě?`,
    (title: string) =>
      `Které tvrzení správně popisuje souvislost uvedenou v materiálu „${title}“?`,
    (title: string) =>
      `Která možnost odpovídá faktu / datu / vztahu z textu „${title}“?`,
    (title: string) =>
      `Čím se podle materiálu „${title}“ liší správné pochopení od časté záměny?`,
    (title: string) =>
      `Která odpověď nejlépe shrnuje důsledek nebo příčinu z textu „${title}“?`,
    (title: string) =>
      `Co text „${title}“ uvádí jako podstatný detail, který se snadno přehlédne?`,
    (title: string) =>
      `Která možnost je v souladu s hlavní argumentací materiálu „${title}“?`,
    (title: string) =>
      `Jaký závěr z textu „${title}“ bys použil u ústní zkoušky?`,
    (title: string) =>
      `Která odpověď správně spojuje pojmy, které materiál „${title}“ dává dohromady?`,
  ];

  const quizSource = factPool.slice(0, 24);
  const quiz = quizSource.slice(0, 10).map((sentence, i) => {
    const correct = clipOption(sentence);
    const distractorPool = quizSource
      .filter((s) => s !== sentence)
      .map((s) => clipOption(s));
    const wrongs = pickDistractors(correct, distractorPool, 3).map((w) =>
      clipOption(w),
    );
    const rawOptions = [
      { id: "A" as const, text: correct },
      { id: "B" as const, text: wrongs[0]! },
      { id: "C" as const, text: wrongs[1]! },
      { id: "D" as const, text: wrongs[2]! },
    ];
    const shuffled = shuffleOptions(rawOptions, correct);
    return {
      id: `src-q-${i + 1}`,
      prompt: quizPrompts[i % quizPrompts.length]!(params.title),
      options: shuffled.options,
      correctOptionId: shuffled.correctOptionId,
      explanation: buildLocalQuizExplanation({
        correctLetter: shuffled.correctOptionId,
        correctText: correct,
        options: shuffled.options,
      }),
    };
  });

  while (quiz.length < 10) {
    const n = quiz.length + 1;
    const correct =
      "Aktivně vybírat klíčová fakta, souvislosti a chytáky přímo z nahraného textu.";
    const rawOptions = [
      { id: "A" as const, text: correct },
      {
        id: "B" as const,
        text: "Stačí si zapamatovat jen název souboru bez čtení obsahu.",
      },
      {
        id: "C" as const,
        text: "Nejlepší je učit se pouze povrchní definice bez souvislostí.",
      },
      {
        id: "D" as const,
        text: "Testování není potřeba, pokud text jednou rychle prolétneš očima.",
      },
    ];
    const shuffled = shuffleOptions(rawOptions, correct);
    quiz.push({
      id: `src-q-fill-${n}`,
      prompt: `Jak nejlíp využít materiál „${params.title}“ při přípravě na test?`,
      options: shuffled.options,
      correctOptionId: shuffled.correctOptionId,
      explanation: buildLocalQuizExplanation({
        correctLetter: shuffled.correctOptionId,
        correctText: correct,
        options: shuffled.options,
      }),
    });
  }

  const summaryBits = factPool.slice(0, 5).join(" ");
  const audioSummary =
    summaryBits.length >= 40
      ? `Shrnutí materiálu „${params.title}“: ${summaryBits.slice(0, 700)}`
      : `Materiál „${params.title}“ z oblasti ${params.subject} obsahuje studijní podklady. Projdi kartičky a test, ať si upevníš hlavní body z nahraného textu.`;

  const storyBeats = factPool.slice(0, 6);
  const story = [
    `Bylo nebylo — a ty právě otevíráš materiál „${params.title}“ z oblasti ${params.subject}.`,
    `Místo biflování si představ cestu: na začátku stojí otázka, uprostřed jsou pojmy jako průvodci a na konci čeká maturita, která chce slyšet souvislosti.`,
    ...storyBeats.map(
      (beat, i) =>
        `Scéna ${i + 1}: ${beat.length > 180 ? `${beat.slice(0, 177)}…` : beat}`,
    ),
    `Pointa příběhu: když si tyto scény převyprávíš vlastními slovy, zapamatuješ si je jako film — ne jako seznam odrážek.`,
  ].join("\n\n");

  const matchPairs = flashcards.slice(0, 5).map((card, i) => ({
    id: `src-match-${i + 1}`,
    term: card.front.length > 70 ? `${card.front.slice(0, 67)}…` : card.front,
    definition: card.back.length > 160 ? `${card.back.slice(0, 157)}…` : card.back,
  }));

  return ensureLearningExtras(
    {
      flashcards: flashcards.slice(0, 10),
      quiz: quiz.slice(0, 10),
      audioSummary,
      story,
      matchPairs,
    },
    params.title,
    params.subject,
  );
}

function getOpenAiApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

/** Doplní / ořízne flashcards i quiz na přesně 10 před validací. */
function normalizeGeneratedPack(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = { ...(raw as Record<string, unknown>) };

  const cards = obj.flashcards;
  if (Array.isArray(cards)) {
    const cleaned = cards
      .filter(
        (c): c is { front: string; back: string } =>
          Boolean(c) &&
          typeof c === "object" &&
          typeof (c as { front?: unknown }).front === "string" &&
          typeof (c as { back?: unknown }).back === "string",
      )
      .map((c) => ({
        front: c.front.trim(),
        back: c.back.trim(),
      }))
      .filter((c) => c.front.length >= 3 && c.back.length >= 3);

    while (cleaned.length < 10 && cleaned.length > 0) {
      const base = cleaned[cleaned.length % cleaned.length]!;
      cleaned.push({
        front: `${base.front} (rozšíření ${cleaned.length + 1})`,
        back: base.back,
      });
    }
    obj.flashcards = cleaned.slice(0, 10);
  }

  const quiz = obj.quiz;
  if (Array.isArray(quiz)) {
    type QuizRaw = {
      prompt: string;
      options: Array<{ id: "A" | "B" | "C" | "D"; text: string }>;
      correctOptionId: "A" | "B" | "C" | "D";
      explanation: string;
    };

    const cleanedQuiz: QuizRaw[] = [];
    for (const item of quiz) {
      if (!item || typeof item !== "object") continue;
      const q = item as Partial<QuizRaw>;
      if (typeof q.prompt !== "string" || !Array.isArray(q.options)) continue;
      if (
        q.correctOptionId !== "A" &&
        q.correctOptionId !== "B" &&
        q.correctOptionId !== "C" &&
        q.correctOptionId !== "D"
      ) {
        continue;
      }
      const options = q.options
        .filter(
          (o): o is { id: "A" | "B" | "C" | "D"; text: string } =>
            Boolean(o) &&
            typeof o === "object" &&
            (o.id === "A" || o.id === "B" || o.id === "C" || o.id === "D") &&
            typeof o.text === "string" &&
            o.text.trim().length >= 2,
        )
        .map((o) => ({ id: o.id, text: o.text.trim() }));
      if (options.length !== 4) continue;
      const explanation =
        typeof q.explanation === "string" && q.explanation.trim().length >= 20
          ? q.explanation.trim()
          : `Správně je ${q.correctOptionId}. Tato možnost odpovídá textu materiálu; ostatní možnosti jsou chytáky založené na záměně podobných pojmů.`;
      cleanedQuiz.push({
        prompt: q.prompt.trim(),
        options,
        correctOptionId: q.correctOptionId,
        explanation,
      });
    }

    while (cleanedQuiz.length < 10 && cleanedQuiz.length > 0) {
      const base = cleanedQuiz[cleanedQuiz.length % cleanedQuiz.length]!;
      cleanedQuiz.push({
        ...base,
        prompt: `${base.prompt} (doplňující otázka ${cleanedQuiz.length + 1})`,
      });
    }
    obj.quiz = cleanedQuiz.slice(0, 10);
  }

  const story = obj.story;
  if (typeof story === "string") {
    obj.story = story.trim();
  }

  const pairs = obj.matchPairs;
  if (Array.isArray(pairs)) {
    const cleanedPairs = pairs
      .filter(
        (p): p is { term: string; definition: string } =>
          Boolean(p) &&
          typeof p === "object" &&
          typeof (p as { term?: unknown }).term === "string" &&
          typeof (p as { definition?: unknown }).definition === "string",
      )
      .map((p) => ({
        term: p.term.trim(),
        definition: p.definition.trim(),
      }))
      .filter((p) => p.term.length >= 2 && p.definition.length >= 5);

    while (cleanedPairs.length < 5 && cleanedPairs.length > 0) {
      const base = cleanedPairs[cleanedPairs.length % cleanedPairs.length]!;
      cleanedPairs.push({
        term: `${base.term} (${cleanedPairs.length + 1})`,
        definition: base.definition,
      });
    }
    obj.matchPairs = cleanedPairs.slice(0, 5);
  }

  return obj;
}

/**
 * Volitelné AI generování přes OpenAI. Při chybě vrátí null → použije se lokální generátor.
 */
export async function buildStudyPackWithOpenAI(params: {
  title: string;
  subject: string;
  sourceText: string;
}): Promise<MaterialStudyPack | null> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) return null;

  const system = `Jsi zkušený český maturální tutor aplikace DámMaturu. Z dodaného studijního textu vytvoř JSON s kartičkami, kvízem, audio shrnutím, příběhem a páry pro hru.

STRIKTNÍ PRAVIDLA PRO KARTIČKY:
a) Vygeneruj PŘESNĚ 10 studijních kartiček (flashcards).
b) Kartičky musí být vysoce kvalitní, promyšlené a musí jít do hloubky. Neptej se jen na nejzákladnější pojmy, ale zaměř se na klíčové souvislosti, důležitá data, vzorce nebo chytáky, které se objevují v textu.
c) Odpovědi musí být detailní, ale jasně a stručně vysvětlené, ideální pro přípravu k maturitě.

STRIKTNÍ PRAVIDLA PRO TESTY (quiz):
1) Vygeneruj PŘESNĚ 10 testových otázek z dodaného textu.
2) Každá otázka musí mít přesně 4 možnosti (A, B, C, D), z nichž právě jedna je správná (correctOptionId).
3) Distraktory NESMÍ být očividné nesmysly — mají být uvěřitelné chytáky z textu.
4) Ke každé otázce detailní explanation (proč správně / proč chytáky).
5) Otázky musí pokrýt klíčová fakta, souvislosti a hlavní myšlenky.

STRIKTNÍ PRAVIDLA PRO PŘÍBĚH (story):
- Napiš poutavý český příběh / metaforu (4–8 odstavců), který mnemotechnicky přepíše obsah textu.
- Suchá fakta podej jako vyprávění se scénami, postavami-pojmy a pointou k maturitě.
- Zachovej věcnou správnost podle textu.

STRIKTNÍ PRAVIDLA PRO HRU (matchPairs):
- Vygeneruj PŘESNĚ 5 párů { term, definition } — pojem <-> definice z textu.
- Term je krátký (pojem/jméno/vzorec), definition je jasná 1–2 věty.

Další pravidla:
- Piš 100% správnou češtinou s diakritikou.
- Vycházej VÝHRADNĚ z dodaného textu.
- audioSummary: 3–5 vět k poslechu.
- Vrať POUZE validní JSON:
{
  "flashcards": [ ... 10 ... ],
  "quiz": [ ... 10 ... ],
  "audioSummary": "...",
  "story": "...",
  "matchPairs": [ ... přesně 5 ... ]
}`;

  const user = `Název: ${params.title}
Předmět: ${params.subject}

TEXT MATERIÁLU:
${params.sourceText.slice(0, 12000)}

Připomenutí: 10 kartiček, 10 testů, 1 příběh, 5 párů pro spojovačku.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_STUDY_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[study-from-source] OpenAI HTTP", res.status);
      return null;
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsedJson = JSON.parse(content) as unknown;
    const normalized = normalizeGeneratedPack(parsedJson);
    const parsed = generatedPackSchema.safeParse(normalized);
    if (!parsed.success) {
      console.error("[study-from-source] OpenAI schema mismatch", parsed.error.issues);
      return null;
    }

    return ensureLearningExtras(
      {
        flashcards: parsed.data.flashcards.map((c, i) => ({
          id: `ai-fc-${i + 1}`,
          front: c.front,
          back: c.back,
        })),
        quiz: parsed.data.quiz.map((q, i) => ({
          id: `ai-q-${i + 1}`,
          prompt: q.prompt,
          options: q.options,
          correctOptionId: q.correctOptionId,
          explanation: q.explanation,
        })),
        audioSummary: parsed.data.audioSummary,
        story: parsed.data.story,
        matchPairs: parsed.data.matchPairs?.map((p, i) => ({
          id: `ai-match-${i + 1}`,
          term: p.term,
          definition: p.definition,
        })),
      },
      params.title,
      params.subject,
    );
  } catch (error) {
    console.error("[study-from-source] OpenAI failed", error);
    return null;
  }
}

export async function generateStudyPackFromSource(params: {
  title: string;
  subject: string;
  sourceText: string;
}): Promise<{ pack: MaterialStudyPack; engine: "openai" | "local" }> {
  const ai = await buildStudyPackWithOpenAI(params);
  if (ai) return { pack: ai, engine: "openai" };
  return {
    pack: buildStudyPackFromSourceText(params),
    engine: "local",
  };
}
