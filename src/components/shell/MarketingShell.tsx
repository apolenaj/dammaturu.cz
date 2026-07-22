import {
  PublicFooter,
  PublicHeader,
} from "@/components/shell/PublicShell";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh max-w-[100vw] flex-col overflow-x-clip bg-paper-wash text-ink">
      <PublicHeader />
      <main id="main-content" className="min-w-0 flex-1 overflow-x-clip">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
