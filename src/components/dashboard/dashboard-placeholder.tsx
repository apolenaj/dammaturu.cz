import { GlassCard } from "@/components/dashboard/glass-card";

export function DashboardPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <GlassCard className="min-h-[50vh] flex flex-col justify-center">
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
        {description}
      </p>
      <p className="mt-6 text-sm font-medium text-blue-300/90">
        Tato sekce se brzy naplní — zatím tu můžeš zůstat v klidu.
      </p>
    </GlassCard>
  );
}
