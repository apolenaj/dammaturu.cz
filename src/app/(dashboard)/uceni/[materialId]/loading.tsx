import { Loader2 } from "lucide-react";
import { GlassCard } from "@/components/dashboard/glass-card";

export default function UceniMaterialLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <GlassCard className="space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
        <div className="h-8 w-2/3 max-w-md animate-pulse rounded bg-white/10" />
        <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
      </GlassCard>

      <GlassCard className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-300" aria-hidden />
        <p className="text-sm font-medium text-white">Připravuji učení…</p>
        <p className="max-w-sm text-xs text-slate-400">
          AI právě sestavuje kartičky, testy a další metody z vybraného materiálu.
        </p>
      </GlassCard>
    </div>
  );
}
