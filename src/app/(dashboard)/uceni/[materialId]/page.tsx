import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Loader2, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/dashboard/glass-card";
import { MaterialStudyWorkspace } from "@/components/dashboard/study/material-study-workspace";
import {
  subjectShortLabel,
  type StudyMaterial,
} from "@/domain/dashboard/study-materials";
import { buildPublicMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { getStudyMaterialById } from "@/server/dashboard/study-materials";
import { resolveMaterialStudyPack } from "@/server/dashboard/resolve-material-study";

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

export const dynamic = "force-dynamic";

function StudyPackFallback({ title }: { title: string }) {
  return (
    <GlassCard className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-300" aria-hidden />
      <p className="text-sm font-medium text-white">
        Generuji učení pro „{title}“…
      </p>
      <p className="max-w-md text-xs text-slate-400">
        Kartičky, testy, příběh a hry vytváří AI — obvykle to trvá několik sekund.
      </p>
    </GlassCard>
  );
}

async function MaterialStudySection({ material }: { material: StudyMaterial }) {
  const study = await resolveMaterialStudyPack(material);

  return (
    <MaterialStudyWorkspace
      materialId={material.id}
      title={material.title}
      pack={study.pack}
      source={study.source}
      warning={study.warning}
      info={study.info}
      error={study.error}
    />
  );
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
            <Sparkles
              className="mt-0.5 h-4 w-4 shrink-0 text-blue-300"
              aria-hidden
            />
            Připravujeme učení z materiálu „{material.title}“ přes AI.
          </p>
        </div>
      </GlassCard>

      <Suspense fallback={<StudyPackFallback title={material.title} />}>
        <MaterialStudySection material={material} />
      </Suspense>

      <GlassCard>
        <h2 className="text-base font-semibold text-white">Další materiál</h2>
        <p className="mt-2 text-sm text-slate-400">
          Až dokončíš opakování, můžeš přejít na jiné učivo nebo nahrát vlastní
          podklad.
        </p>
        <Link
          href="/materialy"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
        >
          Zpět na materiály
        </Link>
      </GlassCard>
    </div>
  );
}
