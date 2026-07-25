import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Headphones,
  Layers,
  Sparkles,
} from "lucide-react";
import { GlassCard } from "@/components/dashboard/glass-card";
import { subjectShortLabel } from "@/domain/dashboard/study-materials";
import { buildPublicMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { getStudyMaterialById } from "@/server/dashboard/study-materials";

type PageProps = {
  params: Promise<{ materialId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { materialId } = await params;
  return {
    ...buildPublicMetadata({
      title: "Učení",
      description: "Učení z vybraného maturitního materiálu.",
      path: `/uceni/${materialId}`,
    }),
    robots: { index: false, follow: false },
  };
}

export default async function UceniMaterialPage({ params }: PageProps) {
  const { materialId } = await params;
  const supabase = await createClient();
  const material = await getStudyMaterialById(supabase, materialId);

  if (!material) {
    notFound();
  }

  const typeLabel =
    material.type === "system" ? "Systémové učivo" : "Tvůj materiál";

  return (
    <div className="space-y-5">
      <Link
        href="/materialy"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Zpět na materiály
      </Link>

      <GlassCard className="overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-blue-500/15 px-2.5 py-1 text-xs font-bold text-blue-300">
                {subjectShortLabel(material.subject)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-400">
                {typeLabel}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {material.title}
            </h1>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              {material.subject}
            </p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_0_28px_-4px_rgba(59,130,246,0.65)]">
            <BookOpen className="h-6 w-6" aria-hidden />
          </span>
        </div>

        <div className="mt-6 rounded-2xl border border-blue-400/20 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-violet-500/15 px-4 py-4 sm:px-5">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-blue-100">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden />
            Brzy z tohoto materiálu vygenerujeme kartičky, testy a audio. Teď
            máš připravený studijní prostor — generování spustíme v dalším
            kroku.
          </p>
        </div>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-3">
        <GlassCard className="text-center">
          <Layers className="mx-auto h-6 w-6 text-blue-300" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-white">Kartičky</p>
          <p className="mt-1 text-xs text-slate-500">Připravujeme</p>
        </GlassCard>
        <GlassCard className="text-center">
          <BookOpen className="mx-auto h-6 w-6 text-indigo-300" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-white">Testy</p>
          <p className="mt-1 text-xs text-slate-500">Připravujeme</p>
        </GlassCard>
        <GlassCard className="text-center">
          <Headphones className="mx-auto h-6 w-6 text-violet-300" aria-hidden />
          <p className="mt-3 text-sm font-semibold text-white">Audio</p>
          <p className="mt-1 text-xs text-slate-500">Připravujeme</p>
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="text-base font-semibold text-white">Další kroky</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          <li>· Extrakce klíčových pojmů z materiálu</li>
          <li>· Generování procvičovacích otázek</li>
          <li>· Krátké audio shrnutí k poslechu</li>
        </ul>
        <Link
          href="/materialy"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
        >
          Vybrat jiný materiál
        </Link>
      </GlassCard>
    </div>
  );
}
