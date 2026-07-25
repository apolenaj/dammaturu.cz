import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-[#070913] font-sans text-white antialiased">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.2),transparent_60%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-7xl">
        <DashboardSidebar />
        <main className="relative z-10 min-w-0 flex-1 space-y-4 p-4 sm:space-y-5 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
