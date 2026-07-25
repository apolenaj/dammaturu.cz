import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  clientIpFromHeaders,
  rateLimit,
} from "@/server/security/rate-limit";
import { assertSameOriginRequest } from "@/server/security/upload-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** OpenAI TTS input limit is 4096 characters. */
const MAX_TTS_CHARS = 4096;

const bodySchema = z.object({
  text: z.string().trim().min(1).max(MAX_TTS_CHARS),
});

/**
 * POST /api/tts
 * Generuje MP3 přes OpenAI TTS (tts-1 / nova).
 * Nikdy nevrací API klíč; jen audio stream nebo JSON chybu.
 */
export async function POST(request: Request) {
  if (!assertSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Požadavek byl odmítnut." },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Pro audio shrnutí se musíš přihlásit." },
      { status: 401 },
    );
  }

  const ip = clientIpFromHeaders(request.headers);
  const limited = rateLimit({
    key: `tts:${user.id}:${ip}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Příliš mnoho požadavků na audio. Chvíli počkej." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Neplatné JSON tělo požadavku." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: `Text pro TTS musí mít 1–${MAX_TTS_CHARS} znaků.`,
      },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  console.log("[DEBUG] OpenAI Key Status (TTS):", !!apiKey);

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Chyba připojení k AI: Zkontrolujte OPENAI_API_KEY (klíč chybí v prostředí).",
      },
      { status: 503 },
    );
  }

  const openai = new OpenAI({ apiKey });

  try {
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: parsed.data.text,
      response_format: "mp3",
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[api/tts] OpenAI speech failed", error);
    const message =
      error instanceof Error
        ? error.message
        : "Nepodařilo se vygenerovat audio.";
    return NextResponse.json(
      {
        ok: false,
        error: message.startsWith("Chyba připojení k AI")
          ? message
          : `Chyba připojení k AI: ${message}`,
      },
      { status: 502 },
    );
  }
}
