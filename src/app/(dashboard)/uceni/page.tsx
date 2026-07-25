import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/dashboard/glass-card";
import { buildPublicMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import {
  listSystemStudyMaterials,
  listUserStudyMaterials,
} from "@/server/dashboard/study-materials";
import { subjectShortLabel } from "@/domain/dashboard/study-materials";

export const metadata: Metadata = {
  ...buildPublicMetadata({
    title: "Učení",
    description: "Studijní prostor pro tvé denní učení.",
    path: "/uceni",
  }),
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function UceniPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let recent: Awaited<ReturnType<typeof listSystemStudyMaterials>> = [];
  try {
    const system = await listSystemStudyMaterials(supabase);
    const own = user ? await listUserStudyMaterials(supabase, user.id) : [];
    recent = [...own.slice(0, 3), ...system.slice(0, 6 - Math.min(own.length, 3))];
  } catch {
    recent = [];
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Učení
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
          Vyber materiál a spusť učení — kartičky, testy a audio připravíme z
          konkrétního podkladu.
        </p>
      </div>

      <GlassCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-white">Začni výběrem materiálu</p>
            <p className="mt-1 text-sm text-slate-400">
              V sekci Materiály najdeš naše učivo i svoje nahrané soubory.
            </p>
          </div>
        </div>
        <Link
          href="/materialy"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 px-6 text-sm font-semibold text-white shadow-[0_0_24px_-6px_rgba(99,102,241,0.65)] transition hover:brightness-110"
        >
          Otevřít materiály
        </Link>
      </GlassCard>

      {recent.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Rychlý start
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((material) => (
              <Link
                key={material.id}
                href={`/uceni/${material.id}`}
                className="group rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-md transition hover:border-blue-400/30 hover:bg-blue-500/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-blue-500/15 px-2 py-0.5 text-[11px] font-bold text-blue-300">
                    {subjectShortLabel(material.subject)}
                  </span>
                  <BookOpen
                    className="h-4 w-4 text-slate-500 transition group-hover:text-blue-300"
                    aria-hidden
                  />
                </div>
                <p className="mt-3 font-semibold text-white">{material.title}</p>
                <p className="mt-1 text-xs text-slate-500">{material.subject}</p>
                <p className="mt-3 text-sm font-semibold text-blue-300">
                  Začít se učit →
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
