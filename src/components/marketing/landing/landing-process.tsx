import {
  ArrowRight,
  BarChart3,
  Brain,
  Cloud,
  FileUp,
  GraduationCap,
  Sparkles,
  Trophy,
  Upload,
} from "lucide-react";
import { SectionHeading } from "./landing-ui";

const steps = [
  {
    icon: Upload,
    title: "Nahraj materiály",
    body: "PDF, poznámky nebo fotky — nahraj, co už máš.",
  },
  {
    icon: Brain,
    title: "AI analyzuje",
    body: "Systém vytáhne klíčové pojmy, mezery a priority.",
  },
  {
    icon: Sparkles,
    title: "Učíš se chytře",
    body: "Audio, příběhy, kartičky, testy i hry — podle tebe.",
  },
  {
    icon: BarChart3,
    title: "Sleduješ pokrok",
    body: "Denní plán, statistiky a série, které drží rytmus.",
  },
  {
    icon: GraduationCap,
    title: "Zvládneš maturitu",
    body: "Připravený na didaktický test i ústní zkoušku.",
  },
] as const;

export function LandingProcess() {
  return (
    <section
      id="jak-to-funguje"
      className="scroll-mt-20 border-t border-white/5 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading title="Jak tě dovedeme k maturitě" />

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative">
                {index < steps.length - 1 ? (
                  <ArrowRight
                    className="pointer-events-none absolute -right-2 top-10 z-10 hidden h-4 w-4 text-white/20 lg:block"
                    aria-hidden
                  />
                ) : null}
                <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-md transition hover:border-white/20 hover:shadow-[0_0_32px_-10px_rgba(64,224,208,0.3)]">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#40E0D0]/20 to-[#8A2BE2]/20 text-[#40E0D0]">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Krok {index + 1}
                  </p>
                  <h3 className="mt-1.5 text-base font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {step.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

const smallFeatures = [
  { icon: FileUp, title: "Vlastní materiály" },
  { icon: Sparkles, title: "AI vysvětlení" },
  { icon: BarChart3, title: "Detailní statistiky" },
  { icon: Cloud, title: "Cloud & sync" },
  { icon: Trophy, title: "Motivace & odměny" },
] as const;

export function LandingSmallFeatures() {
  return (
    <section
      id="materialy"
      className="scroll-mt-20 border-t border-white/5 px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading title="Vše, co potřebuješ na jednom místě" />
        <ul className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {smallFeatures.map(({ icon: Icon, title }) => (
            <li
              key={title}
              className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center backdrop-blur-md transition hover:border-white/20 hover:shadow-[0_0_28px_-10px_rgba(138,43,226,0.35)]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#40E0D0]/15 to-[#8A2BE2]/15 text-[#40E0D0]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-white">{title}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
