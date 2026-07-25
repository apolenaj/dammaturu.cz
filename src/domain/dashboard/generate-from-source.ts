/**
 * Generuje kartičky, kvíz a audio shrnutí přímo z extrahovaného textu materiálu.
 * Preferuje OpenAI (pokud je OPENAI_API_KEY), jinak lokální grounded generátor.
 */

import { z } from "zod";
import type { MaterialStudyPack } from "@/domain/dashboard/material-study-content";

const generatedPackSchema = z.object({
  flashcards: z
    .array(
      z.object({
        front: z.string().min(3).max(280),
        back: z.string().min(3).max(800),
      }),
    )
    .min(3)
    .max(8),
  quiz: z
    .array(
      z.object({
        prompt: z.string().min(5).max(320),
        options: z
          .array(z.object({ id: z.enum(["A", "B", "C", "D"]), text: z.string() }))
          .length(4),
        correctOptionId: z.enum(["A", "B", "C", "D"]),
        explanation: z.string().min(5).max(500),
      }),
    )
    .min(3)
    .max(6),
  audioSummary: z.string().min(40).max(2000),
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
      return n !== correctNorm && Math.abs(p.length - correct.length) < 120;
    }),
    (p) => p.toLowerCase().slice(0, 40),
  );
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);
  while (picked.length < count) {
    picked.push(`Nesouvisí s obsahem materiálu (${picked.length + 1})`);
  }
  return picked;
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
    /\b(je|jsou|znamená|označuje|patří|zahrnuje|představuje)\b/i.test(s),
  );
  const factPool =
    definitionLike.length >= 4 ? definitionLike : sentences.slice(0, 24);

  const flashcards = factPool.slice(0, 5).map((sentence, i) => {
    const short =
      sentence.length > 110 ? `${sentence.slice(0, 107).trim()}…` : sentence;
    return {
      id: `src-fc-${i + 1}`,
      front: `Co uvádí tvůj materiál? (${i + 1}/${Math.min(5, factPool.length)})`,
      back: short,
    };
  });

  // Doplň, pokud je málo vět
  while (flashcards.length < 4) {
    const n = flashcards.length + 1;
    flashcards.push({
      id: `src-fc-fill-${n}`,
      front: `Jaký je hlavní cíl materiálu „${params.title}“?`,
      back: `Procvičit klíčové poznatky z oblasti ${params.subject} podle vlastního podkladu.`,
    });
  }

  const quizSource = factPool.slice(0, 8);
  const quiz = quizSource.slice(0, 4).map((sentence, i) => {
    const correct = sentence.length > 140 ? `${sentence.slice(0, 137)}…` : sentence;
    const distractorPool = quizSource
      .filter((s) => s !== sentence)
      .map((s) => (s.length > 140 ? `${s.slice(0, 137)}…` : s));
    const wrongs = pickDistractors(correct, distractorPool, 3);
    const rawOptions = [
      { id: "A" as const, text: correct },
      { id: "B" as const, text: wrongs[0]! },
      { id: "C" as const, text: wrongs[1]! },
      { id: "D" as const, text: wrongs[2]! },
    ];
    const shuffled = shuffleOptions(rawOptions, correct);
    return {
      id: `src-q-${i + 1}`,
      prompt: `Která informace pochází z tvého materiálu „${params.title}“?`,
      options: shuffled.options,
      correctOptionId: shuffled.correctOptionId,
      explanation: `Správná odpověď je převzatá přímo z nahraného textu: ${correct}`,
    };
  });

  while (quiz.length < 3) {
    const n = quiz.length + 1;
    quiz.push({
      id: `src-q-fill-${n}`,
      prompt: `Nejlepší způsob práce s materiálem „${params.title}“ je:`,
      options: [
        { id: "A", text: "Vybrat klíčové věty a převyprávět je vlastními slovy" },
        { id: "B", text: "Ignorovat obsah souboru" },
        { id: "C", text: "Učit se jen podle názvu souboru" },
        { id: "D", text: "Přeskočit opakování úplně" },
      ],
      correctOptionId: "A" as const,
      explanation:
        "Aktivní práce s textem — výběr a převyprávění — vede k lepšímu zapamatování.",
    });
  }

  const summaryBits = factPool.slice(0, 4).join(" ");
  const audioSummary =
    summaryBits.length >= 40
      ? `Shrnutí materiálu „${params.title}“: ${summaryBits.slice(0, 700)}`
      : `Materiál „${params.title}“ z oblasti ${params.subject} obsahuje studijní podklady. Projdi kartičky a test, ať si upevníš hlavní body z nahraného textu.`;

  return { flashcards, quiz, audioSummary };
}

function getOpenAiApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
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

  const system = `Jsi český tutor pro maturitu (DámMaturu). Z dodaného studijního textu vytvoř JSON s kartičkami, kvízem a audio shrnutím.
Pravidla:
- Piš perfektní češtinou s diakritikou.
- Vycházej VÝHRADNĚ z dodaného textu, nic si nevymýšlej mimo něj.
- flashcards: 5 položek {front, back}
- quiz: 4 otázky, každá 4 možnosti A–D, correctOptionId, explanation
- audioSummary: 2–4 věty shrnutí pro poslech
Vrať pouze validní JSON objekt.`;

  const user = `Název: ${params.title}
Předmět: ${params.subject}

TEXT MATERIÁLU:
${params.sourceText.slice(0, 12000)}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_STUDY_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.3,
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
    const parsed = generatedPackSchema.safeParse(parsedJson);
    if (!parsed.success) {
      console.error("[study-from-source] OpenAI schema mismatch");
      return null;
    }

    return {
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
    };
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
