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
import { cn } from "@/lib/cn";

const steps = [
  {
    icon: Upload,
    title: "Nahraj materiály",
    body: "PDF, poznámky nebo fotky — nahraj, co už máš.",
    iconClassName: "text-violet-300",
    iconShellClassName:
      "bg-violet-500/15 ring-1 ring-violet-400/40 shadow-[0_0_15px_rgba(167,139,250,0.55),0_0_35px_rgba(139,92,246,0.25)]",
    badgeClassName:
      "bg-violet-500 text-white ring-2 ring-violet-300/40 shadow-[0_0_12px_rgba(139,92,246,0.65)]",
  },
  {
    icon: Brain,
    title: "AI analyzuje",
    body: "Systém vytáhne klíčové pojmy, mezery a priority.",
    iconClassName: "text-cyan-300",
    iconShellClassName:
      "bg-cyan-500/15 ring-1 ring-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.55),0_0_35px_rgba(6,182,212,0.25)]",
    badgeClassName:
      "bg-cyan-500 text-white ring-2 ring-cyan-300/40 shadow-[0_0_12px_rgba(6,182,212,0.65)]",
  },
  {
    icon: Sparkles,
    title: "Učíš se chytře",
    body: "Audio, příběhy, kartičky, testy i hry — podle tebe.",
    iconClassName: "text-emerald-300",
    iconShellClassName:
      "bg-emerald-500/15 ring-1 ring-emerald-400/40 shadow-[0_0_15px_rgba(52,211,153,0.55),0_0_35px_rgba(16,185,129,0.25)]",
    badgeClassName:
      "bg-emerald-500 text-white ring-2 ring-emerald-300/40 shadow-[0_0_12px_rgba(16,185,129,0.65)]",
  },
  {
    icon: BarChart3,
    title: "Sleduješ pokrok",
    body: "Denní plán, statistiky a série, které drží rytmus.",
    iconClassName: "text-orange-300",
    iconShellClassName:
      "bg-orange-500/15 ring-1 ring-orange-400/40 shadow-[0_0_15px_rgba(251,146,60,0.55),0_0_35px_rgba(249,115,22,0.25)]",
    badgeClassName:
      "bg-orange-500 text-white ring-2 ring-orange-300/40 shadow-[0_0_12px_rgba(249,115,22,0.65)]",
  },
  {
    icon: GraduationCap,
    title: "Zvládneš maturitu",
    body: "Připravený na didaktický test i ústní zkoušku.",
    iconClassName: "text-fuchsia-300",
    iconShellClassName:
      "bg-fuchsia-500/15 ring-1 ring-fuchsia-400/40 shadow-[0_0_15px_rgba(232,121,249,0.55),0_0_35px_rgba(217,70,239,0.25)]",
    badgeClassName:
      "bg-fuchsia-500 text-white ring-2 ring-fuchsia-300/40 shadow-[0_0_12px_rgba(217,70,239,0.65)]",
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

        <ol className="mt-14 flex flex-col items-stretch gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-0">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const stepNumber = index + 1;
            const isLast = index === steps.length - 1;

            return (
              <li
                key={step.title}
                className={cn(
                  "relative flex flex-1 flex-col items-center text-center",
                  !isLast && "lg:pr-8",
                )}
              >
                {/* Thin purple arrow between steps — desktop only */}
                {!isLast ? (
                  <div
                    className="pointer-events-none absolute left-[calc(50%+2.75rem)] right-0 top-[2.35rem] z-10 hidden items-center lg:flex"
                    aria-hidden
                  >
                    <div className="h-px flex-1 bg-gradient-to-r from-violet-400/70 via-fuchsia-400/50 to-violet-400/20" />
                    <ArrowRight
                      className="ml-0.5 h-3.5 w-3.5 shrink-0 text-violet-400"
                      strokeWidth={2.25}
                    />
                  </div>
                ) : null}

                {/* Neon icon with overlapping step badge */}
                <div className="relative mb-5">
                  <div
                    className={cn(
                      "flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-2xl",
                      step.iconShellClassName,
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-8 w-8 drop-shadow-[0_0_8px_currentColor]",
                        step.iconClassName,
                      )}
                      aria-hidden
                    />
                  </div>
                  <span
                    className={cn(
                      "absolute -bottom-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                      step.badgeClassName,
                    )}
                    aria-label={`Krok ${stepNumber}`}
                  >
                    {stepNumber}
                  </span>
                </div>

                <h3 className="max-w-[11rem] text-base font-semibold tracking-tight text-white sm:text-lg">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-[14rem] text-sm leading-relaxed text-slate-400">
                  {step.body}
                </p>
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
        <ul className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-5">
          {smallFeatures.map(({ icon: Icon, title }) => (
            <li
              key={title}
              className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-6 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md transition hover:border-violet-400/30 hover:shadow-[0_0_28px_-10px_rgba(139,92,246,0.45)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/30 shadow-[0_0_18px_rgba(167,139,250,0.35)]">
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
