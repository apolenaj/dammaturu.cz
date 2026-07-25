/**
 * Generuje studijní balíček výhradně přes OpenAI.
 * Tolerantní validace (5–10 položek) + normalizace; při selhání split na 2 volání.
 *
 * POUZE SERVER — nesmí se importovat z `'use client'` komponent.
 */

import "server-only";

import { z } from "zod";
import type {
  MaterialFlashcard,
  MaterialMatchPair,
  MaterialQuizQuestion,
  MaterialStudyPack,
} from "@/domain/dashboard/material-study-content";

export class OpenAiStudyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAiStudyError";
  }
}

const optionIdSchema = z.enum(["A", "B", "C", "D"]);

/** Volná položka — krátké stringy necháme projít a ořízneme / doplníme později. */
const looseFlashcardSchema = z.object({
  front: z.string().trim().min(3).max(400),
  back: z.string().trim().min(3).max(1200),
});

const looseQuizSchema = z.object({
  prompt: z.string().trim().min(5).max(500),
  options: z
    .array(
      z.object({
        id: z.union([optionIdSchema, z.string()]),
        text: z.string().trim().min(1).max(400),
      }),
    )
    .min(2)
    .max(6),
  correctOptionId: z.union([optionIdSchema, z.string()]),
  explanation: z.string().trim().max(1200).optional().default(""),
});

const looseMatchSchema = z.object({
  term: z.string().trim().min(1).max(120),
  definition: z.string().trim().min(3).max(400),
});

const loosePackSchema = z.object({
  flashcards: z.array(looseFlashcardSchema).min(1).max(20).optional().default([]),
  quiz: z.array(looseQuizSchema).min(1).max(20).optional().default([]),
  audioSummary: z.string().trim().min(20).max(3000).optional().default(""),
  story: z.string().trim().min(40).max(8000).optional().default(""),
  matchPairs: z.array(looseMatchSchema).min(1).max(12).optional().default([]),
});

type LoosePack = z.infer<typeof loosePackSchema>;

function requireOpenAiApiKey(): string {
  console.log("[DEBUG] OpenAI Key Status:", !!process.env.OPENAI_API_KEY);

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new OpenAiStudyError(
      "Chyba připojení k AI: Zkontrolujte OPENAI_API_KEY (klíč chybí v prostředí).",
    );
  }
  if (key.includes("YOUR") || key === "sk-..." || key.length < 20) {
    throw new OpenAiStudyError(
      "Chyba připojení k AI: Zkontrolujte OPENAI_API_KEY (klíč vypadá jako zástupný).",
    );
  }
  return key;
}

function clampText(value: string, max: number): string {
  const t = value.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function ensureMinText(value: string, min: number, pad: string): string {
  const t = value.trim();
  if (t.length >= min) return t;
  const combined = `${t} ${pad}`.trim();
  return combined.length >= min ? combined : `${combined} — viz studijní text.`;
}

function normalizeOptionId(raw: string): "A" | "B" | "C" | "D" | null {
  const u = raw.trim().toUpperCase();
  if (u === "A" || u === "B" || u === "C" || u === "D") return u;
  return null;
}

function buildSystemPromptCompact(): string {
  return `Jsi český maturitní tutor. Z textu vrať JEDEN JSON objekt.

Pravidla:
- Jen čeština s diakritikou.
- Jen fakta z dodaného textu.
- Žádné „Scéna 1“, žádné „klíčový bod N“.

Požadovaná pole:
- flashcards: 5–10 objektů {front, back} — reálné otázky/odpovědi
- quiz: 5–10 objektů {prompt, options[A-D], correctOptionId, explanation}
- matchPairs: 5 objektů {term, definition} — konkrétní pojmy z textu
- story: plynulý příběh (několik odstavců oddělených \\n\\n), bez číslování scén
- audioSummary: 3–6 vět shrnutí

Vrať pouze JSON.`;
}

const STUDY_JSON_SCHEMA = {
  name: "material_study_pack",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["flashcards", "quiz", "audioSummary", "story", "matchPairs"],
    properties: {
      flashcards: {
        type: "array",
        minItems: 5,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["front", "back"],
          properties: {
            front: { type: "string" },
            back: { type: "string" },
          },
        },
      },
      quiz: {
        type: "array",
        minItems: 5,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["prompt", "options", "correctOptionId", "explanation"],
          properties: {
            prompt: { type: "string" },
            options: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "text"],
                properties: {
                  id: { type: "string", enum: ["A", "B", "C", "D"] },
                  text: { type: "string" },
                },
              },
            },
            correctOptionId: {
              type: "string",
              enum: ["A", "B", "C", "D"],
            },
            explanation: { type: "string" },
          },
        },
      },
      audioSummary: { type: "string" },
      story: { type: "string" },
      matchPairs: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["term", "definition"],
          properties: {
            term: { type: "string" },
            definition: { type: "string" },
          },
        },
      },
    },
  },
} as const;

async function callOpenAiJson(params: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  useStructuredSchema: boolean;
}): Promise<unknown> {
  const body: Record<string, unknown> = {
    model: params.model,
    temperature: 0.3,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
  };

  if (params.useStructuredSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: STUDY_JSON_SCHEMA,
    };
  } else {
    body.response_format = { type: "json_object" };
  }

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("[study-from-source] network failed", error);
    throw new OpenAiStudyError(
      "Chyba připojení k AI: Nepodařilo se spojit s OpenAI (síť). Zkontrolujte OPENAI_API_KEY a připojení.",
    );
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errJson = (await res.json()) as {
        error?: { message?: string };
      };
      if (errJson.error?.message) detail = errJson.error.message;
    } catch {
      // ignore
    }
    console.error("[study-from-source] OpenAI HTTP", res.status, detail);

    // Structured Outputs někdy selžou na starším modelu — signalizace pro fallback.
    if (
      params.useStructuredSchema &&
      (res.status === 400 || detail.toLowerCase().includes("json_schema"))
    ) {
      throw new OpenAiStudyError(`STRUCTURED_OUTPUTS_UNSUPPORTED:${detail}`);
    }

    if (res.status === 401 || res.status === 403) {
      throw new OpenAiStudyError(
        "Chyba připojení k AI: Zkontrolujte OPENAI_API_KEY (neplatný nebo bez oprávnění).",
      );
    }
    throw new OpenAiStudyError(
      `Chyba připojení k AI: OpenAI odpovědělo chybou (${detail}).`,
    );
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new OpenAiStudyError(
      "Chyba připojení k AI: OpenAI vrátilo prázdnou odpověď.",
    );
  }

  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new OpenAiStudyError(
      "Chyba připojení k AI: OpenAI nevrátilo validní JSON.",
    );
  }
}

function normalizeQuizItem(
  raw: LoosePack["quiz"][number],
  index: number,
): MaterialQuizQuestion | null {
  const ids: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
  const byId = new Map<string, string>();
  for (const opt of raw.options) {
    const id = normalizeOptionId(String(opt.id));
    if (!id) continue;
    byId.set(id, clampText(opt.text, 280));
  }

  // Doplň chybějící volby z textů bez id / placeholderů odvozených z promptu.
  for (const id of ids) {
    if (!byId.has(id)) {
      const fallbackText =
        raw.options.find((o) => !normalizeOptionId(String(o.id)))?.text ??
        `${id}) varianta k otázce`;
      byId.set(id, clampText(fallbackText, 280));
    }
  }

  let correct = normalizeOptionId(String(raw.correctOptionId));
  if (!correct || !byId.has(correct)) correct = "A";

  const prompt = clampText(raw.prompt, 400);
  if (prompt.length < 5) return null;

  const explanation = ensureMinText(
    raw.explanation || "",
    20,
    `Správná odpověď je ${correct}, protože odpovídá obsahu studijního textu.`,
  );

  return {
    id: `ai-q-${index + 1}`,
    prompt,
    options: ids.map((id) => ({
      id,
      text: byId.get(id) ?? `${id}`,
    })),
    correctOptionId: correct,
    explanation: clampText(explanation, 900),
  };
}

/**
 * Zvolní validaci: 5–10 kartiček/testů, 3–5 párů.
 * Chybějící položky doplní z ostatních reálných částí balíčku (ne dummy texty).
 */
function normalizeLoosePack(
  raw: unknown,
  ctx: { title: string; subject: string },
): MaterialStudyPack {
  const parsed = loosePackSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      "[study-from-source] loose schema mismatch",
      parsed.error.issues.slice(0, 10),
    );
    throw new OpenAiStudyError(
      "Chyba připojení k AI: Odpověď modelu nemá použitelnou strukturu studijního balíčku.",
    );
  }

  const data = parsed.data;

  let flashcards: MaterialFlashcard[] = data.flashcards
    .map((c, i) => ({
      id: `ai-fc-${i + 1}`,
      front: clampText(c.front, 280),
      back: clampText(
        ensureMinText(c.back, 8, `Odpověď k tématu ${ctx.title}.`),
        900,
      ),
    }))
    .filter((c) => c.front.length >= 3 && c.back.length >= 8);

  let quiz: MaterialQuizQuestion[] = data.quiz
    .map((q, i) => normalizeQuizItem(q, i))
    .filter((q): q is MaterialQuizQuestion => Boolean(q));

  let matchPairs: MaterialMatchPair[] = data.matchPairs
    .map((p, i) => ({
      id: `ai-match-${i + 1}`,
      term: clampText(p.term, 80),
      definition: clampText(
        ensureMinText(p.definition, 8, `Pojem z oblasti ${ctx.subject}.`),
        280,
      ),
    }))
    .filter((p) => p.term.length >= 1 && p.definition.length >= 8);

  // Doplnění z reálných položek (ne generické „klíčový bod“).
  if (flashcards.length < 5) {
    for (const q of quiz) {
      if (flashcards.length >= 5) break;
      const correct =
        q.options.find((o) => o.id === q.correctOptionId)?.text ?? q.explanation;
      flashcards.push({
        id: `ai-fc-from-q-${flashcards.length + 1}`,
        front: clampText(q.prompt, 280),
        back: clampText(correct, 900),
      });
    }
  }

  if (quiz.length < 5) {
    for (const card of flashcards) {
      if (quiz.length >= 5) break;
      quiz.push({
        id: `ai-q-from-fc-${quiz.length + 1}`,
        prompt: clampText(card.front, 400),
        options: [
          { id: "A", text: clampText(card.back, 280) },
          {
            id: "B",
            text: clampText(`Jiný výklad k tématu ${ctx.title}`, 280),
          },
          {
            id: "C",
            text: clampText(`Nesouvisející fakt mimo ${ctx.subject}`, 280),
          },
          { id: "D", text: "Nic z uvedeného neplatí" },
        ],
        correctOptionId: "A",
        explanation: clampText(
          ensureMinText(
            `Správně je A — odpovídá odpovědi z kartičky: ${card.back}`,
            30,
            "Odpověď vychází ze studijního textu.",
          ),
          900,
        ),
      });
    }
  }

  if (matchPairs.length < 5) {
    for (const card of flashcards) {
      if (matchPairs.length >= 5) break;
      matchPairs.push({
        id: `ai-match-from-fc-${matchPairs.length + 1}`,
        term: clampText(card.front.replace(/\?$/, ""), 80),
        definition: clampText(card.back, 280),
      });
    }
  }

  flashcards = flashcards.slice(0, 10);
  quiz = quiz.slice(0, 10);
  matchPairs = matchPairs.slice(0, 5);

  if (flashcards.length < 5 || quiz.length < 5 || matchPairs.length < 3) {
    throw new OpenAiStudyError(
      "Chyba připojení k AI: Model nevrátil dostatek použitelných položek (min. 5 kartiček, 5 testů, 3 páry).",
    );
  }

  let story = data.story.trim();
  if (story.length < 80) {
    story = [
      `Pojďme si projít téma „${ctx.title}“ jako souvislý příběh z oblasti ${ctx.subject}.`,
      ...flashcards.slice(0, 4).map(
        (c) =>
          `Nejdřív si ujasníme otázku: ${c.front} Odpověď z látky zní: ${c.back}`,
      ),
      `Když si tyto body převyprávíš vlastními slovy, držíš jádro maturitního okruhu pohromadě.`,
    ].join("\n\n");
  }
  story = story.replace(/\bScéna\s*\d+\s*:?/gi, "").trim();

  let audioSummary = data.audioSummary.trim();
  if (audioSummary.length < 40) {
    audioSummary = flashcards
      .slice(0, 4)
      .map((c) => `${c.front} ${c.back}`)
      .join(" ");
  }
  audioSummary = clampText(
    ensureMinText(
      audioSummary,
      40,
      `Shrnutí tématu ${ctx.title} z předmětu ${ctx.subject}.`,
    ),
    2000,
  );

  return {
    flashcards,
    quiz,
    audioSummary,
    story: clampText(story, 6000),
    matchPairs,
  };
}

async function generatePartialPack(params: {
  apiKey: string;
  model: string;
  title: string;
  subject: string;
  sourceText: string;
  mode: "cards_quiz" | "story_match";
}): Promise<Partial<LoosePack>> {
  const shared = `Název: ${params.title}
Předmět: ${params.subject}

TEXT:
${params.sourceText.slice(0, 10000)}`;

  if (params.mode === "cards_quiz") {
    const system = `Jsi český maturitní tutor. Vrať JSON:
{"flashcards":[{"front":"...","back":"..."}],"quiz":[{"prompt":"...","options":[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],"correctOptionId":"A","explanation":"..."}],"audioSummary":"..."}
5–10 kartiček, 5–10 otázek, audioSummary 3–6 vět. Jen fakta z textu, jen čeština.`;
    const raw = await callOpenAiJson({
      apiKey: params.apiKey,
      model: params.model,
      system,
      user: shared,
      useStructuredSchema: false,
    });
    return loosePackSchema.partial().parse(raw);
  }

  const system = `Jsi český maturitní tutor. Vrať JSON:
{"story":"...","matchPairs":[{"term":"...","definition":"..."}]}
Plynulý příběh bez „Scéna N“, přesně 5 párů pojem–definice z textu. Jen čeština.`;
  const raw = await callOpenAiJson({
    apiKey: params.apiKey,
    model: params.model,
    system,
    user: shared,
    useStructuredSchema: false,
  });
  return loosePackSchema.partial().parse(raw);
}

/**
 * Generování přes OpenAI. Toleruje 5–10 položek; při selhání zkusí split.
 */
export async function generateStudyPackFromSource(params: {
  title: string;
  subject: string;
  sourceText: string;
}): Promise<{ pack: MaterialStudyPack; engine: "openai" }> {
  const apiKey = requireOpenAiApiKey();
  const sourceText = params.sourceText.trim();
  if (sourceText.length < 40) {
    throw new OpenAiStudyError(
      "Chyba připojení k AI: Extrahovaný text je příliš krátký pro smysluplné generování.",
    );
  }

  const model = process.env.OPENAI_STUDY_MODEL?.trim() || "gpt-4o-mini";
  const user = `Název materiálu: ${params.title}
Předmět: ${params.subject}

STUDJNÍ TEXT:
${sourceText.slice(0, 12000)}

Vrať flashcards (5–10), quiz (5–10), matchPairs (5), story a audioSummary.`;

  let raw: unknown | null = null;

  try {
    raw = await callOpenAiJson({
      apiKey,
      model,
      system: buildSystemPromptCompact(),
      user,
      useStructuredSchema: true,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.startsWith("STRUCTURED_OUTPUTS_UNSUPPORTED")) {
      console.warn(
        "[study-from-source] structured outputs unavailable, falling back to json_object",
      );
      raw = await callOpenAiJson({
        apiKey,
        model,
        system: buildSystemPromptCompact(),
        user,
        useStructuredSchema: false,
      });
    } else {
      // Zkusíme ještě plain json_object před splitem.
      try {
        raw = await callOpenAiJson({
          apiKey,
          model,
          system: buildSystemPromptCompact(),
          user,
          useStructuredSchema: false,
        });
      } catch (inner) {
        console.error("[study-from-source] single-shot failed", inner);
        raw = null;
      }
    }
  }

  if (raw) {
    try {
      const pack = normalizeLoosePack(raw, {
        title: params.title,
        subject: params.subject,
      });
      return { pack, engine: "openai" };
    } catch (error) {
      console.warn(
        "[study-from-source] normalize failed, trying split generation",
        error,
      );
    }
  }

  // Split: menší JSON bloky = vyšší spolehlivost.
  const [cardsPart, storyPart] = await Promise.all([
    generatePartialPack({
      apiKey,
      model,
      title: params.title,
      subject: params.subject,
      sourceText,
      mode: "cards_quiz",
    }),
    generatePartialPack({
      apiKey,
      model,
      title: params.title,
      subject: params.subject,
      sourceText,
      mode: "story_match",
    }),
  ]);

  const merged = {
    flashcards: cardsPart.flashcards ?? [],
    quiz: cardsPart.quiz ?? [],
    audioSummary: cardsPart.audioSummary ?? "",
    story: storyPart.story ?? "",
    matchPairs: storyPart.matchPairs ?? [],
  };

  const pack = normalizeLoosePack(merged, {
    title: params.title,
    subject: params.subject,
  });

  return { pack, engine: "openai" };
}
