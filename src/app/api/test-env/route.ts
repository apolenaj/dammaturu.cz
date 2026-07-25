import { NextResponse } from "next/server";

/**
 * Diagnostika env — NIKDY nevrací hodnotu tajných klíčů, jen boolean existence.
 * GET /api/test-env
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
    isNodeEnv: process.env.NODE_ENV,
  });
}
