/**
 * Generuje studijní balíček výhradně přes OpenAI.
 * Žádné lokální „dummy“ fallbacky — při chybě vyhodí Error.
 */

import { z } from "zod";
import type { MaterialStudyPack } from "@/domain/dashboard/material-study-content";

export class OpenAiStudyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAiStudyError";
  }
}

const generatedPackSchema = z.object({
  flashcards: z
    .array(
      z.object({
        front: z.string().min(8).max(280),
        back: z.string().min(12).max(900),
      }),
    )
    .length(10),
  quiz: z
    .array(
      z.object({
        prompt: z.string().min(10).max(400),
        options: z
          .array(
            z.object({
              id: z.enum(["A", "B", "C", "D"]),
              text: z.string().min(2).max(280),
            }),
          )
          .length(4),
        correctOptionId: z.enum(["A", "B", "C", "D"]),
        explanation: z.string().min(30).max(900),
      }),
    )
    .length(10),
  audioSummary: z.string().min(60).max(2000),
  story: z.string().min(200).max(6000),
  matchPairs: z
    .array(
      z.object({
        term: z.string().min(2).max(80),
        definition: z.string().min(12).max(280),
      }),
    )
    .length(5),
});

function requireOpenAiApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new OpenAiStudyError(
      "Chyba připojení k AI: Zkontrolujte OPENAI_API_KEY (klíč chybí v prostředí).",
    );
  }
  if (
    key.includes("YOUR") ||
    key === "sk-..." ||
    key.length < 20
  ) {
    throw new OpenAiStudyError(
      "Chyba připojení k AI: Zkontrolujte OPENAI_API_KEY (klíč vypadá jako zástupný).",
    );
  }
  return key;
}

function buildSystemPrompt(): string {
  return `Jsi zkušený český maturální tutor aplikace DámMaturu.
Z dodaného studijního textu vytvoř JEDEN JSON objekt se studijním obsahem.

JAZYK: 100% správná čeština s diakritikou. Žádné anglické vsuvky, žádné zkomoleniny.

ZAKÁZÁNO:
- Generické otázky typu „Jaký klíčový bod 4/10…“
- Označování odstavců jako „Scéna 1“, „Scéna 2“
- Vymyšlená fakta mimo dodaný text
- Prázdné nebo opakující se položky
- Doplňování „(rozšíření N)“ nebo podobných záplat

KARTIČKY (flashcards) — přesně 10:
- Reálné maturitní otázky přímo z látky v textu
- front = konkrétní otázka (proč / jak / souvislost / datum / vztah / chyták)
- back = jasná, hutná odpověď 1–3 věty z textu

TESTY (quiz) — přesně 10:
- Každá otázka má možnosti A, B, C, D; právě jedna je správná (correctOptionId)
- Distraktory musí být uvěřitelné chytáky z podobných pojmů/faktů v textu
- explanation detailně vysvětlí, proč je správná možnost správná a proč jsou ostatní chytáky
- Otázky pokrývají klíčová fakta, souvislosti a hlavní myšlenky textu

PŘÍBĚH (story):
- Plynulé, smysluplné vyprávění (4–8 odstavců oddělených prázdným řádkem)
- Přepiš obsah textu do poutavé metafory / příběhu, který vysvětluje kontext
- NIKDY nepoužívej číslované „Scéna 1/2/3“
- Zachovej věcnou správnost podle textu

HRA (matchPairs) — přesně 5:
- 5 REÁLNÝCH specifických pojmů z textu (jména, termíny, vzorce, období…)
- Ke každému stručná, přesná definice (1–2 věty) z textu
- term krátký (max ~6 slov), definition konkrétní

AUDIO (audioSummary):
- 3–6 vět shrnutí vhodných k poslechu, jen z textu

Vrať POUZE validní JSON:
{
  "flashcards": [{"front":"...","back":"..."}],
  "quiz": [{"prompt":"...","options":[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],"correctOptionId":"A","explanation":"..."}],
  "audioSummary": "...",
  "story": "...",
  "matchPairs": [{"term":"...","definition":"..."}]
}`;
}

/**
 * Striktní generování přes OpenAI. Při jakékoli chybě vyhodí OpenAiStudyError.
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

STUDJNÍ TEXT (zdroj pravdy):
${sourceText.slice(0, 14000)}

Požadavky na výstup: přesně 10 kartiček, přesně 10 testových otázek, plynulý příběh bez „Scéna N“, přesně 5 párů pojem–definice, audio shrnutí.`;

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: user },
        ],
      }),
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
      // ignore parse
    }
    console.error("[study-from-source] OpenAI HTTP", res.status, detail);
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

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content) as unknown;
  } catch {
    throw new OpenAiStudyError(
      "Chyba připojení k AI: OpenAI nevrátilo validní JSON.",
    );
  }

  const parsed = generatedPackSchema.safeParse(parsedJson);
  if (!parsed.success) {
    console.error(
      "[study-from-source] schema mismatch",
      parsed.error.issues.slice(0, 8),
    );
    throw new OpenAiStudyError(
      "Chyba připojení k AI: Odpověď modelu nemá požadovanou strukturu (10 kartiček, 10 testů, příběh, 5 párů).",
    );
  }

  const pack: MaterialStudyPack = {
    flashcards: parsed.data.flashcards.map((c, i) => ({
      id: `ai-fc-${i + 1}`,
      front: c.front.trim(),
      back: c.back.trim(),
    })),
    quiz: parsed.data.quiz.map((q, i) => ({
      id: `ai-q-${i + 1}`,
      prompt: q.prompt.trim(),
      options: q.options.map((o) => ({ id: o.id, text: o.text.trim() })),
      correctOptionId: q.correctOptionId,
      explanation: q.explanation.trim(),
    })),
    audioSummary: parsed.data.audioSummary.trim(),
    story: parsed.data.story.trim(),
    matchPairs: parsed.data.matchPairs.map((p, i) => ({
      id: `ai-match-${i + 1}`,
      term: p.term.trim(),
      definition: p.definition.trim(),
    })),
  };

  return { pack, engine: "openai" };
}
