"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { logoutLearnerAction } from "@/server/actions/auth";
import { DASHBOARD_NAV_ITEMS } from "@/components/dashboard/nav";

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-dvh w-[4.5rem] shrink-0 flex-col border-r border-white/10 bg-[#0c0e16]/95 px-2 py-5 backdrop-blur-xl sm:w-56 sm:px-3 lg:w-64 lg:px-4">
      <div className="mb-6 flex items-center justify-center gap-2.5 sm:justify-start sm:px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.45)]">
          DM
        </span>
        <span className="hidden text-base font-bold tracking-tight text-white sm:inline">
          DámMaturu
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Studijní navigace">
        {DASHBOARD_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-blue-500/20 text-blue-100 shadow-[inset_0_0_0_1px_rgba(96,165,250,0.35)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "mx-auto h-5 w-5 shrink-0 sm:mx-0",
                  active ? "text-blue-400" : "text-slate-500",
                )}
                aria-hidden
              />
              <span className="hidden truncate sm:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <form action={logoutLearnerAction} className="mt-4 border-t border-white/10 pt-4">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut className="mx-auto h-5 w-5 sm:mx-0" aria-hidden />
          <span className="hidden sm:inline">Odhlásit se</span>
        </button>
      </form>
    </aside>
  );
}
