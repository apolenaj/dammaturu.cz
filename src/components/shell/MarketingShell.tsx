import {
  PublicFooter,
  PublicHeader,
} from "@/components/shell/PublicShell";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper-wash text-ink">
      <PublicHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
