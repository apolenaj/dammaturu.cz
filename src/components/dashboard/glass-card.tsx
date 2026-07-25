import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function GlassCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
