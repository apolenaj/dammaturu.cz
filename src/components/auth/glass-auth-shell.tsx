import Link from "next/link";
import type { ReactNode } from "react";

export function GlassAuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-x-clip bg-[#070913] px-4 py-12 font-sans text-white antialiased sm:px-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.22),transparent_60%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.12),transparent_70%)] blur-2xl"
        aria-hidden
      />

      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
        >
          ← Zpět na úvod
        </Link>

        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md sm:p-8">
          <p className="inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
            DámMaturu
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {description}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}
